-- ============================================================
-- v3.1: วันที่ทั้งหมดใช้เวลาไทย (Asia/Bangkok) — Supabase จริงตั้งเป็น UTC ถ้าใช้ current_date ช่วง 00:00–07:00 วันจะเพี้ยน
-- Don't let your boss kill you back — ฐานข้อมูล v3 (Supabase / PostgreSQL)
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → Run (รันซ้ำได้ ไม่ลบข้อมูลเดิม)
--
-- v2: บริษัทมีรหัสผ่าน 2 ชุด
--   • รหัสพนักงาน (join)   — พนักงานใช้เข้าร่วมบริษัทจากหน้าเว็บบนบอร์ด
--   • รหัสผู้ดูแล (admin)  — HR ใช้ล็อกอินเว็บบริษัท ดูภาพรวมและรายบุคคล
-- หลักความปลอดภัย
--  • ตารางทั้งหมดปิด (RLS เปิด + ไม่มี policy + revoke) ใช้ได้ผ่านฟังก์ชันด้านล่างเท่านั้น
--  • รหัสผ่านเก็บเป็น bcrypt (pgcrypto) ไม่เก็บตัวจริง · ผิด 10 ครั้ง ล็อก 10 นาที
--  • บอร์ดยืนยันตัวด้วย secret ของตัวเอง (เก็บเป็น SHA-256)
--  • ชื่อพนักงานขึ้นเฉพาะเมื่อพนักงานติ๊กยินยอมเอง (PDPA ม.26) ไม่ยินยอม = เห็นเป็น "โต๊ะ #xxxxxx"
--  • ไม่มีรูป ไม่มีเสียง มีแค่ตัวเลขเวลา/จำนวนครั้ง
-- ============================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.pg_companies (
  id           text primary key,
  name         text not null,
  admin_hash   text not null,
  join_hash    text not null,
  fails        integer not null default 0,
  locked_until timestamptz,
  created_at   timestamptz not null default now()
);
create unique index if not exists pg_companies_name on public.pg_companies (lower(name));

create table if not exists public.pg_devices (
  device_id   text primary key,
  company     text not null,
  secret_hash text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.pg_members (
  company      text not null,
  device_id    text not null,
  display_name text,                -- เก็บเสมอเพื่อให้พนักงานเห็นชื่อตัวเอง แต่บริษัทเห็นเฉพาะเมื่อ share_name
  department   text not null default 'ทั่วไป',
  share_name   boolean not null default false,
  joined_at    timestamptz not null default now(),
  primary key (company, device_id)
);

create table if not exists public.pg_desks (
  company      text not null,
  device_id    text not null,
  department   text not null default 'ทั่วไป',
  display_name text,
  present      boolean not null default false,
  posture      text,
  is_bad       boolean not null default false,
  screen_cm    integer,
  sit_now_s    integer not null default 0,
  last_seen    timestamptz not null default now(),
  primary key (company, device_id)
);

create table if not exists public.pg_daily (
  company      text not null,
  device_id    text not null,
  day          date not null,
  department   text not null default 'ทั่วไป',
  display_name text,
  sit_s        integer not null default 0,
  good_s       integer not null default 0,
  bad_s        integer not null default 0,
  alerts       integer not null default 0,
  breaks       integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (company, device_id, day)
);
create index if not exists pg_daily_company_day on public.pg_daily (company, day);

alter table public.pg_companies enable row level security;
alter table public.pg_devices   enable row level security;
alter table public.pg_members   enable row level security;
alter table public.pg_desks     enable row level security;
alter table public.pg_daily     enable row level security;
revoke all on public.pg_companies, public.pg_devices, public.pg_members, public.pg_desks, public.pg_daily
  from anon, authenticated;

-- v1 อ่าน dashboard ได้ด้วยรหัสบริษัทอย่างเดียว → v2 รายชื่อบริษัทเปิดให้เห็น จึงต้องลบทิ้ง
drop function if exists public.pg_dashboard(text, integer);
drop function if exists public.pg_forget_company(text);

-- ---------- ตัวช่วยภายใน (ไม่เปิดให้เรียกจากภายนอก) ----------
create or replace function public._pg_desk_code(p_device text)
returns text language sql immutable as $$ select left(md5(p_device), 6) $$;

-- ตรวจรหัสผ่าน + นับครั้งที่ผิด (คืน null = ผ่าน หรือรหัสข้อผิดพลาด)
-- ห้าม raise หลังนับครั้งผิด ไม่งั้นการนับจะถูกย้อนกลับ (rollback)
create or replace function public._pg_check_pw(p_company text, p_pw text, p_kind text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare c pg_companies; v_hash text;
begin
  select * into c from pg_companies where id = p_company for update;
  if not found then return 'no_company'; end if;
  if c.locked_until is not null and c.locked_until > now() then return 'locked'; end if;
  v_hash := case when p_kind = 'admin' then c.admin_hash else c.join_hash end;
  if crypt(coalesce(p_pw, ''), v_hash) = v_hash then
    update pg_companies set fails = 0, locked_until = null where id = p_company;
    return null;
  end if;
  update pg_companies
     set fails = c.fails + 1,
         locked_until = case when c.fails + 1 >= 10 then now() + interval '10 minutes' end
   where id = p_company;
  return case when c.fails + 1 >= 10 then 'locked' else 'wrong_password' end;
end;
$$;

-- ---------- สาธารณะ: รายชื่อบริษัท (ชื่อเท่านั้น) ----------
create or replace function public.pg_list_companies()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name) order by lower(name)), '[]'::jsonb)
  from pg_companies
$$;

-- ---------- HR: สร้างบริษัท ----------
create or replace function public.pg_create_company(p_name text, p_admin_pw text, p_join_pw text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_name text := btrim(coalesce(p_name, '')); v_id text;
begin
  if length(v_name) < 2 or length(v_name) > 60 then return jsonb_build_object('ok', false, 'error', 'bad_name'); end if;
  if length(coalesce(p_admin_pw, '')) < 8 then return jsonb_build_object('ok', false, 'error', 'admin_pw_short'); end if;
  if length(coalesce(p_join_pw, '')) < 6 then return jsonb_build_object('ok', false, 'error', 'join_pw_short'); end if;
  if p_admin_pw = p_join_pw then return jsonb_build_object('ok', false, 'error', 'same_pw'); end if;
  if exists (select 1 from pg_companies where lower(name) = lower(v_name)) then
    return jsonb_build_object('ok', false, 'error', 'name_taken');
  end if;
  v_id := 'co_' || encode(gen_random_bytes(9), 'hex');
  insert into pg_companies (id, name, admin_hash, join_hash)
  values (v_id, v_name, crypt(p_admin_pw, gen_salt('bf', 10)), crypt(p_join_pw, gen_salt('bf', 10)));
  return jsonb_build_object('ok', true, 'id', v_id, 'name', v_name);
end;
$$;

-- ---------- บอร์ด: เข้าร่วมบริษัท ----------
create or replace function public.pg_join(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_company text := coalesce(p->>'company', '');
  v_device  text := coalesce(p->>'device_id', '');
  v_secret  text := coalesce(p->>'secret', '');
  v_hash    text;
  v_err     text;
  v_name    text := left(nullif(btrim(coalesce(p->>'display_name', '')), ''), 40);
  v_dept    text := left(coalesce(nullif(btrim(p->>'department'), ''), 'ทั่วไป'), 40);
  v_share   boolean := coalesce((p->>'share_name')::boolean, false);
begin
  if v_device !~ '^[A-Za-z0-9_-]{8,64}$' or length(v_secret) < 16 then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  v_err := _pg_check_pw(v_company, p->>'password', 'join');
  if v_err is not null then return jsonb_build_object('ok', false, 'error', v_err); end if;
  v_hash := encode(sha256(convert_to(v_secret, 'UTF8')), 'hex');
  if exists (select 1 from pg_devices where device_id = v_device and secret_hash <> v_hash) then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;
  -- ย้ายบริษัท: ลบข้อมูลที่ค้างในบริษัทเก่า
  delete from pg_desks   where device_id = v_device and company <> v_company;
  delete from pg_daily   where device_id = v_device and company <> v_company;
  delete from pg_members where device_id = v_device and company <> v_company;
  insert into pg_devices (device_id, company, secret_hash) values (v_device, v_company, v_hash)
  on conflict (device_id) do update set company = excluded.company;
  insert into pg_members (company, device_id, display_name, department, share_name)
  values (v_company, v_device, v_name, v_dept, v_share)
  on conflict (company, device_id) do update set
    display_name = excluded.display_name, department = excluded.department, share_name = excluded.share_name;
  return jsonb_build_object('ok', true, 'company', v_company,
                            'name', (select name from pg_companies where id = v_company),
                            'desk', _pg_desk_code(v_device));
end;
$$;

-- ---------- บอร์ด: ออกจากบริษัท (ลบข้อมูลของโต๊ะนี้ทั้งหมด) ----------
create or replace function public.pg_leave(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device text := coalesce(p->>'device_id', '');
  v_hash   text := encode(sha256(convert_to(coalesce(p->>'secret', ''), 'UTF8')), 'hex');
begin
  if not exists (select 1 from pg_devices where device_id = v_device and secret_hash = v_hash) then
    return jsonb_build_object('ok', true);       -- ไม่มีข้อมูลอยู่แล้ว
  end if;
  delete from pg_desks   where device_id = v_device;
  delete from pg_daily   where device_id = v_device;
  delete from pg_members where device_id = v_device;
  delete from pg_devices where device_id = v_device;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------- บอร์ด: ส่งสถานะ + สถิติ (ทุก 10 วินาที) ----------
create or replace function public.pg_report(p jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device  text := coalesce(p->>'device_id', '');
  v_hash    text := encode(sha256(convert_to(coalesce(p->>'secret', ''), 'UTF8')), 'hex');
  v_company text;
  m         pg_members;
  v_name    text;
  d         jsonb;
  v_day     date;
begin
  select company into v_company from pg_devices where device_id = v_device and secret_hash = v_hash;
  if v_company is null then raise exception 'not_joined'; end if;
  select * into m from pg_members where company = v_company and device_id = v_device;
  if not found then raise exception 'not_joined'; end if;
  v_name := case when m.share_name then m.display_name end;

  insert into pg_desks as t (company, device_id, department, display_name, present, posture, is_bad,
                             screen_cm, sit_now_s, last_seen)
  values (v_company, v_device, m.department, v_name,
          coalesce((p->>'present')::boolean, false), left(p->>'posture', 20),
          coalesce((p->>'is_bad')::boolean, false),
          case when p->>'screen_cm' is null then null else least(greatest((p->>'screen_cm')::numeric, 0), 500)::int end,
          least(greatest(coalesce((p->>'sit_now_s')::numeric, 0), 0), 86400)::int, now())
  on conflict (company, device_id) do update set
    department = excluded.department, display_name = excluded.display_name, present = excluded.present,
    posture = excluded.posture, is_bad = excluded.is_bad, screen_cm = excluded.screen_cm,
    sit_now_s = excluded.sit_now_s, last_seen = now();

  for d in select * from jsonb_array_elements(coalesce(p->'days', '[]'::jsonb)) loop
    continue when coalesce(d->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$';
    v_day := (d->>'date')::date;
    continue when v_day < (now() at time zone 'Asia/Bangkok')::date - 7 or v_day > (now() at time zone 'Asia/Bangkok')::date + 1;
    insert into pg_daily as t (company, device_id, day, department, display_name, sit_s, good_s, bad_s, alerts, breaks, updated_at)
    values (v_company, v_device, v_day, m.department, v_name,
            least(greatest(coalesce((d->>'sit')::numeric, 0), 0), 86400)::int,
            least(greatest(coalesce((d->>'good')::numeric, 0), 0), 86400)::int,
            least(greatest(coalesce((d->>'bad')::numeric, 0), 0), 86400)::int,
            least(greatest(coalesce((d->>'alerts')::numeric, 0), 0), 10000)::int,
            least(greatest(coalesce((d->>'breaks')::numeric, 0), 0), 1000)::int, now())
    on conflict (company, device_id, day) do update set
      department = excluded.department, display_name = excluded.display_name,
      sit_s = excluded.sit_s, good_s = excluded.good_s, bad_s = excluded.bad_s,
      alerts = excluded.alerts, breaks = excluded.breaks, updated_at = now();
  end loop;
  return 'ok';
end;
$$;

-- ---------- HR: ภาพรวมบริษัท + รายชื่อพนักงาน ----------
create or replace function public.pg_admin_dashboard(p_company text, p_password text, p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_err  text := _pg_check_pw(p_company, p_password, 'admin');
  v_days integer := least(greatest(coalesce(p_days, 7), 1), 31);
begin
  if v_err is not null then return jsonb_build_object('ok', false, 'error', v_err); end if;
  return jsonb_build_object(
    'ok', true,
    'company', (select name from pg_companies where id = p_company),
    'server_time', now(),
    'employees', coalesce((
      select jsonb_agg(jsonb_build_object(
        'desk', _pg_desk_code(m.device_id),
        'name', case when m.share_name then m.display_name end,
        'department', m.department,
        'online', coalesce(k.last_seen > now() - interval '60 seconds', false),
        'present', coalesce(k.present, false), 'posture', k.posture, 'is_bad', coalesce(k.is_bad, false),
        'screen_cm', k.screen_cm, 'sit_now_s', coalesce(k.sit_now_s, 0), 'last_seen', k.last_seen,
        'today', (select jsonb_build_object('sit_s', sit_s, 'good_s', good_s, 'bad_s', bad_s, 'alerts', alerts, 'breaks', breaks)
                  from pg_daily where company = m.company and device_id = m.device_id and day = (now() at time zone 'Asia/Bangkok')::date),
        'week', (select jsonb_build_object('sit_s', sum(sit_s), 'good_s', sum(good_s), 'bad_s', sum(bad_s), 'alerts', sum(alerts))
                 from pg_daily where company = m.company and device_id = m.device_id and day > (now() at time zone 'Asia/Bangkok')::date - v_days))
        order by m.department, m.share_name desc, m.display_name nulls last, m.device_id)
      from pg_members m left join pg_desks k on k.company = m.company and k.device_id = m.device_id
      where m.company = p_company), '[]'::jsonb),
    'days', coalesce((
      select jsonb_agg(x order by x->>'day') from (
        select jsonb_build_object('day', day, 'desks', count(*), 'sit_s', sum(sit_s), 'good_s', sum(good_s),
                                  'bad_s', sum(bad_s), 'alerts', sum(alerts), 'breaks', sum(breaks)) as x
        from pg_daily where company = p_company and day > (now() at time zone 'Asia/Bangkok')::date - v_days
        group by day) s), '[]'::jsonb));
end;
$$;

-- ---------- HR: ข้อมูลรายบุคคล ----------
create or replace function public.pg_admin_employee(p_company text, p_password text, p_desk text, p_days integer default 14)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_err    text := _pg_check_pw(p_company, p_password, 'admin');
  v_days   integer := least(greatest(coalesce(p_days, 14), 1), 31);
  v_device text;
  m        pg_members;
begin
  if v_err is not null then return jsonb_build_object('ok', false, 'error', v_err); end if;
  select device_id into v_device from pg_members where company = p_company and _pg_desk_code(device_id) = p_desk;
  if v_device is null then return jsonb_build_object('ok', false, 'error', 'no_employee'); end if;
  select * into m from pg_members where company = p_company and device_id = v_device;
  return jsonb_build_object(
    'ok', true, 'desk', p_desk, 'name', case when m.share_name then m.display_name end,
    'department', m.department, 'joined_at', m.joined_at,
    'live', (select jsonb_build_object('online', last_seen > now() - interval '60 seconds', 'present', present,
                    'posture', posture, 'is_bad', is_bad, 'screen_cm', screen_cm, 'sit_now_s', sit_now_s, 'last_seen', last_seen)
             from pg_desks where company = p_company and device_id = v_device),
    'days', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'sit_s', sit_s, 'good_s', good_s, 'bad_s', bad_s,
                                                          'alerts', alerts, 'breaks', breaks) order by day)
                      from pg_daily where company = p_company and device_id = v_device and day > (now() at time zone 'Asia/Bangkok')::date - v_days), '[]'::jsonb));
end;
$$;

-- ---------- HR: นำพนักงานออก / ลบบริษัท ----------
create or replace function public.pg_admin_remove(p_company text, p_password text, p_desk text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_err text := _pg_check_pw(p_company, p_password, 'admin'); v_device text;
begin
  if v_err is not null then return jsonb_build_object('ok', false, 'error', v_err); end if;
  select device_id into v_device from pg_members where company = p_company and _pg_desk_code(device_id) = p_desk;
  if v_device is null then return jsonb_build_object('ok', false, 'error', 'no_employee'); end if;
  delete from pg_desks   where company = p_company and device_id = v_device;
  delete from pg_daily   where company = p_company and device_id = v_device;
  delete from pg_members where company = p_company and device_id = v_device;
  delete from pg_devices where device_id = v_device and company = p_company;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.pg_admin_delete_company(p_company text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_err text := _pg_check_pw(p_company, p_password, 'admin');
begin
  if v_err is not null then return jsonb_build_object('ok', false, 'error', v_err); end if;
  delete from pg_desks     where company = p_company;
  delete from pg_daily     where company = p_company;
  delete from pg_members   where company = p_company;
  delete from pg_devices   where company = p_company;
  delete from pg_companies where id = p_company;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------- สิทธิ์ ----------
revoke all on function public._pg_desk_code(text), public._pg_check_pw(text, text, text) from public, anon, authenticated;
revoke all on function public.pg_list_companies(), public.pg_create_company(text, text, text), public.pg_join(jsonb),
  public.pg_leave(jsonb), public.pg_report(jsonb), public.pg_admin_dashboard(text, text, integer),
  public.pg_admin_employee(text, text, text, integer), public.pg_admin_remove(text, text, text),
  public.pg_admin_delete_company(text, text) from public;
grant execute on function public.pg_list_companies(), public.pg_create_company(text, text, text), public.pg_join(jsonb),
  public.pg_leave(jsonb), public.pg_report(jsonb), public.pg_admin_dashboard(text, text, integer),
  public.pg_admin_employee(text, text, text, integer), public.pg_admin_remove(text, text, text),
  public.pg_admin_delete_company(text, text) to anon, authenticated;

-- ============================================================
-- v3 — เว็บแอปออนไลน์ (เปิดจากที่ไหนก็ได้) ↔ Supabase ↔ บอร์ดทุกเครื่อง
--   • บอร์ดทุกเครื่องลงทะเบียนตัวเอง + ส่งสถานะล่าสุดทุก 10 วิ (ทั้งโหมดส่วนตัวและบริษัท)
--   • ผู้ใช้จับคู่เว็บกับเครื่องของตัวเองด้วย "รหัสจับคู่" 10 ตัวอักษร (ติดไว้ที่เครื่อง/ดูในหน้าเครื่อง)
--     → ได้ token เก็บในเบราว์เซอร์ ใช้ดูสถานะ สถิติ ตั้งค่า และสั่งงานเครื่อง
--   • ตั้งค่าจากเว็บ → บอร์ดรับไปใช้ในรอบซิงก์ถัดไป · คำสั่ง (ปรับเทียบ/ทดสอบเสียง/พักสายตา) หมดอายุใน 2 นาที
--   • ไม่มีภาพจากกล้องขึ้นคลาวด์ มีแค่ชื่อท่า ระยะ และตัวเลขสถิติ
-- ============================================================
create table if not exists public.pg_units (
  device_id   text primary key,
  secret_hash text not null,
  pair_hash   text,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz
);
create unique index if not exists pg_units_pair on public.pg_units (pair_hash) where pair_hash is not null;

create table if not exists public.pg_unit_live (
  device_id  text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.pg_unit_daily (
  device_id  text not null,
  day        date not null,
  sit_s      integer not null default 0,
  good_s     integer not null default 0,
  bad_s      integer not null default 0,
  alerts     integer not null default 0,
  breaks     integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (device_id, day)
);

create table if not exists public.pg_unit_settings (
  device_id  text primary key,
  settings   jsonb not null default '{}'::jsonb,
  version    integer not null default 0,
  cmds       jsonb not null default '[]'::jsonb,
  cmd_seq    integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.pg_viewers (
  token_hash text primary key,
  device_id  text not null,
  created_at timestamptz not null default now(),
  last_used  timestamptz not null default now()
);
create index if not exists pg_viewers_device on public.pg_viewers (device_id);

alter table public.pg_units         enable row level security;
alter table public.pg_unit_live     enable row level security;
alter table public.pg_unit_daily    enable row level security;
alter table public.pg_unit_settings enable row level security;
alter table public.pg_viewers       enable row level security;
revoke all on public.pg_units, public.pg_unit_live, public.pg_unit_daily, public.pg_unit_settings, public.pg_viewers
  from anon, authenticated;

create or replace function public._pg_sha(t text)
returns text language sql immutable as $$ select encode(sha256(convert_to(coalesce(t, ''), 'UTF8')), 'hex') $$;

-- รหัสจับคู่: ตัดช่องว่าง/ขีด แล้วเป็นตัวพิมพ์ใหญ่ (ตัวอักษรที่ใช้ไม่มี 0 O 1 I เพื่อไม่ให้อ่านสับสน)
create or replace function public._pg_norm_code(t text)
returns text language sql immutable as $$ select upper(regexp_replace(coalesce(t, ''), '[^A-Za-z0-9]', '', 'g')) $$;

create or replace function public._pg_viewer(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_dev text;
begin
  if coalesce(p_token, '') !~ '^[0-9a-f]{48}$' then return null; end if;
  update pg_viewers set last_used = now() where token_hash = _pg_sha(p_token) returning device_id into v_dev;
  return v_dev;
end;
$$;

-- ค่าที่เว็บตั้งได้ (บอร์ดตรวจซ้ำอีกชั้น)
create or replace function public._pg_clean_settings(p jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  out jsonb := '{}'::jsonb;
  k text; lo int; hi int;
  lims jsonb := '{"bad_seconds":[5,600],"sit_minutes":[10,180],"nudge_seconds":[0,120],
                  "screen_min":[30,90],"screen_max":[50,150],"fusion_tol":[3,30]}'::jsonb;
begin
  if jsonb_typeof(p) <> 'object' then return out; end if;
  for k in select jsonb_object_keys(lims) loop
    if jsonb_typeof(p->k) = 'number' then
      lo := (lims->k->>0)::int; hi := (lims->k->>1)::int;
      out := out || jsonb_build_object(k, least(greatest(round((p->>k)::numeric)::int, lo), hi));
    end if;
  end loop;
  foreach k in array array['muted', 'eye_auto', 'push_enabled'] loop
    if jsonb_typeof(p->k) = 'boolean' then out := out || jsonb_build_object(k, p->k); end if;
  end loop;
  if p->>'lang' in ('th', 'en') then out := out || jsonb_build_object('lang', p->>'lang'); end if;
  return out;
end;
$$;

-- ---------- บอร์ด: ซิงก์ทุก 10 วินาที (ลงทะเบียนครั้งแรกอัตโนมัติ) ----------
-- p = {device_id, secret, pair_code?, live{...}, days[{date,sit,good,bad,alerts,breaks}],
--      settings{...}, settings_version, settings_dirty, ack_cmd,
--      present, posture, is_bad, screen_cm, sit_now_s}   (5 ค่าท้าย = สำหรับ HR ถ้าเข้าร่วมบริษัท)
create or replace function public.pg_unit_sync(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device text := coalesce(p->>'device_id', '');
  v_hash   text := _pg_sha(p->>'secret');
  v_code   text := _pg_norm_code(p->>'pair_code');
  u        pg_units;
  s        pg_unit_settings;
  d        jsonb;
  v_day    date;
  v_ver    int := coalesce((p->>'settings_version')::int, 0);
  v_send   jsonb := null;
  v_comp   jsonb := null;
  m        pg_members;
begin
  if v_device !~ '^[A-Za-z0-9_-]{8,64}$' or length(coalesce(p->>'secret', '')) < 16 then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  select * into u from pg_units where device_id = v_device for update;
  if not found then
    insert into pg_units (device_id, secret_hash) values (v_device, v_hash) returning * into u;
  elsif u.secret_hash <> v_hash then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;
  if v_code ~ '^[A-HJ-NP-Z2-9]{10}$' and u.pair_hash is distinct from _pg_sha(v_code)
     and not exists (select 1 from pg_units where pair_hash = _pg_sha(v_code) and device_id <> v_device) then
    update pg_units set pair_hash = _pg_sha(v_code) where device_id = v_device;
    -- v3.1: เปลี่ยนรหัสจับคู่ = ตัดเบราว์เซอร์ที่จับคู่ไว้เดิมทั้งหมด (ครั้งแรกยังไม่มีใคร ไม่กระทบ)
    delete from pg_viewers where device_id = v_device;
  end if;
  update pg_units set last_seen = now() where device_id = v_device;

  if jsonb_typeof(p->'live') = 'object' and length((p->'live')::text) <= 8000 then
    insert into pg_unit_live (device_id, data, updated_at) values (v_device, p->'live', now())
    on conflict (device_id) do update set data = excluded.data, updated_at = now();
  end if;

  for d in select * from jsonb_array_elements(case when jsonb_typeof(p->'days') = 'array' then p->'days' else '[]'::jsonb end) loop
    continue when coalesce(d->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$';
    v_day := (d->>'date')::date;
    continue when v_day < (now() at time zone 'Asia/Bangkok')::date - 8 or v_day > (now() at time zone 'Asia/Bangkok')::date + 1;
    insert into pg_unit_daily (device_id, day, sit_s, good_s, bad_s, alerts, breaks, updated_at)
    values (v_device, v_day,
            least(greatest(coalesce((d->>'sit')::numeric, 0), 0), 86400)::int,
            least(greatest(coalesce((d->>'good')::numeric, 0), 0), 86400)::int,
            least(greatest(coalesce((d->>'bad')::numeric, 0), 0), 86400)::int,
            least(greatest(coalesce((d->>'alerts')::numeric, 0), 0), 10000)::int,
            least(greatest(coalesce((d->>'breaks')::numeric, 0), 0), 1000)::int, now())
    on conflict (device_id, day) do update set sit_s = excluded.sit_s, good_s = excluded.good_s,
      bad_s = excluded.bad_s, alerts = excluded.alerts, breaks = excluded.breaks, updated_at = now();
  end loop;
  delete from pg_unit_daily where device_id = v_device and day < (now() at time zone 'Asia/Bangkok')::date - 30;

  -- ค่าตั้งค่า: เว็บแก้ล่าสุดชนะ · บอร์ดแก้เองในเครื่อง (dirty) → อัปขึ้นคลาวด์
  select * into s from pg_unit_settings where device_id = v_device for update;
  if not found then
    insert into pg_unit_settings (device_id, settings, version)
    values (v_device, _pg_clean_settings(p->'settings'), 1) returning * into s;
    v_send := s.settings;
  elsif coalesce((p->>'settings_dirty')::boolean, false) and v_ver = s.version then
    update pg_unit_settings set settings = s.settings || _pg_clean_settings(p->'settings'),
           version = s.version + 1, updated_at = now()
     where device_id = v_device returning * into s;
    v_send := s.settings;
  elsif s.version > v_ver then
    v_send := s.settings;
  end if;
  -- คำสั่งที่บอร์ดทำแล้ว / เก่ากว่า 2 นาที → ลบ
  update pg_unit_settings set cmds = coalesce((
      select jsonb_agg(c) from jsonb_array_elements(s.cmds) c
       where (c->>'id')::int > coalesce((p->>'ack_cmd')::int, 0)
         and (c->>'at')::timestamptz > now() - interval '2 minutes'), '[]'::jsonb)
   where device_id = v_device returning * into s;

  -- เข้าร่วมบริษัทอยู่ → ส่งให้ HR เหมือน v2
  select mm.* into m from pg_members mm join pg_devices dv on dv.device_id = mm.device_id and dv.company = mm.company
   where mm.device_id = v_device and dv.secret_hash = v_hash;
  if found then
    perform pg_report(p);
    v_comp := jsonb_build_object('id', m.company, 'name', (select name from pg_companies where id = m.company),
                                 'desk', _pg_desk_code(v_device), 'department', m.department,
                                 'display_name', m.display_name, 'share_name', m.share_name);
  end if;

  return jsonb_build_object('ok', true, 'settings_version', s.version, 'settings', v_send,
                            'cmds', s.cmds, 'company', v_comp, 'paired', u.pair_hash is not null or v_code <> '');
end;
$$;

-- ---------- เว็บ: จับคู่ด้วยรหัสที่เครื่อง ----------
create or replace function public.pg_pair(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_dev text; v_token text;
begin
  select device_id into v_dev from pg_units where pair_hash = _pg_sha(_pg_norm_code(p_code));
  if v_dev is null then
    perform pg_sleep(0.5);                         -- ชะลอการเดารหัส
    return jsonb_build_object('ok', false, 'error', 'bad_code');
  end if;
  v_token := encode(gen_random_bytes(24), 'hex');
  insert into pg_viewers (token_hash, device_id) values (_pg_sha(v_token), v_dev);
  delete from pg_viewers where device_id = v_dev and token_hash in (
    select token_hash from pg_viewers where device_id = v_dev order by last_used desc offset 50);  -- v3.1: 10→50 กันงานโชว์คนจับคู่เยอะแล้วมือถือเจ้าของหลุด
  return jsonb_build_object('ok', true, 'token', v_token, 'desk', _pg_desk_code(v_dev));
end;
$$;

-- ---------- เว็บ: ข้อมูลทั้งหมดของเครื่องที่จับคู่ ----------
create or replace function public.pg_me(p_token text, p_days integer default 14)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dev text := _pg_viewer(p_token);
  u pg_units; l pg_unit_live; s pg_unit_settings; m pg_members;
  v_comp jsonb := null;
begin
  if v_dev is null then return jsonb_build_object('ok', false, 'error', 'unpaired'); end if;
  select * into u from pg_units where device_id = v_dev;
  select * into l from pg_unit_live where device_id = v_dev;
  select * into s from pg_unit_settings where device_id = v_dev;
  select mm.* into m from pg_members mm join pg_devices dv on dv.device_id = mm.device_id and dv.company = mm.company
   where mm.device_id = v_dev;
  if found then
    v_comp := jsonb_build_object('id', m.company, 'name', (select name from pg_companies where id = m.company),
                                 'department', m.department, 'display_name', m.display_name, 'share_name', m.share_name);
  end if;
  return jsonb_build_object(
    'ok', true,
    'desk', _pg_desk_code(v_dev),
    'online', u.last_seen is not null and u.last_seen > now() - interval '40 seconds',
    'last_seen', u.last_seen,
    'live', l.data,
    'live_age_s', case when l.updated_at is null then null else extract(epoch from now() - l.updated_at)::int end,
    'settings', coalesce(s.settings, '{}'::jsonb),
    'settings_version', coalesce(s.version, 0),
    'pending_cmds', coalesce(jsonb_array_length(s.cmds), 0),
    'company', v_comp,
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('date', g.day::date, 'sit_s', coalesce(dd.sit_s, 0), 'good_s', coalesce(dd.good_s, 0),
                                          'bad_s', coalesce(dd.bad_s, 0), 'alerts', coalesce(dd.alerts, 0),
                                          'breaks', coalesce(dd.breaks, 0)) order by g.day)
        from generate_series((now() at time zone 'Asia/Bangkok')::date - (least(greatest(coalesce(p_days, 14), 1), 30) - 1), (now() at time zone 'Asia/Bangkok')::date, interval '1 day') as g(day)
        left join pg_unit_daily dd on dd.device_id = v_dev and dd.day = g.day::date), '[]'::jsonb));
end;
$$;

-- ---------- เว็บ: แก้ค่าตั้งค่า ----------
create or replace function public.pg_me_settings(p_token text, p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_dev text := _pg_viewer(p_token); v_new jsonb; s pg_unit_settings;
begin
  if v_dev is null then return jsonb_build_object('ok', false, 'error', 'unpaired'); end if;
  v_new := _pg_clean_settings(p_settings);
  if v_new = '{}'::jsonb then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  insert into pg_unit_settings (device_id, settings, version) values (v_dev, v_new, 1)
  on conflict (device_id) do update set settings = pg_unit_settings.settings || excluded.settings,
    version = pg_unit_settings.version + 1, updated_at = now()
  returning * into s;
  if (s.settings->>'screen_max')::int <= (s.settings->>'screen_min')::int then
    update pg_unit_settings set settings = settings || jsonb_build_object('screen_max', (s.settings->>'screen_min')::int + 10)
     where device_id = v_dev returning * into s;
  end if;
  return jsonb_build_object('ok', true, 'settings', s.settings, 'settings_version', s.version);
end;
$$;

-- ---------- เว็บ: สั่งงานเครื่อง ----------
create or replace function public.pg_me_command(p_token text, p_cmd text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_dev text := _pg_viewer(p_token); s pg_unit_settings;
begin
  if v_dev is null then return jsonb_build_object('ok', false, 'error', 'unpaired'); end if;
  if p_cmd not in ('calibrate', 'test_buzzer', 'relax_toggle', 'relax_reset') then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  insert into pg_unit_settings (device_id) values (v_dev) on conflict (device_id) do nothing;
  update pg_unit_settings
     set cmd_seq = cmd_seq + 1,
         cmds = (select coalesce(jsonb_agg(c), '[]'::jsonb) from (
                   select c from jsonb_array_elements(cmds) c order by (c->>'id')::int desc limit 9) x)
                || jsonb_build_array(jsonb_build_object('id', cmd_seq + 1, 'cmd', p_cmd, 'at', now()))
   where device_id = v_dev returning * into s;
  return jsonb_build_object('ok', true, 'id', s.cmd_seq);
end;
$$;

-- ---------- เว็บ: เข้าร่วม / ออกจากบริษัท ----------
create or replace function public.pg_me_join(p_token text, p_company text, p_password text,
                                             p_display_name text default null, p_department text default null,
                                             p_share_name boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_dev  text := _pg_viewer(p_token);
  v_err  text;
  v_hash text;
  v_name text := left(nullif(btrim(coalesce(p_display_name, '')), ''), 40);
  v_dept text := left(coalesce(nullif(btrim(p_department), ''), 'ทั่วไป'), 40);
begin
  if v_dev is null then return jsonb_build_object('ok', false, 'error', 'unpaired'); end if;
  v_err := _pg_check_pw(p_company, p_password, 'join');
  if v_err is not null then return jsonb_build_object('ok', false, 'error', v_err); end if;
  select secret_hash into v_hash from pg_units where device_id = v_dev;
  delete from pg_desks   where device_id = v_dev and company <> p_company;
  delete from pg_daily   where device_id = v_dev and company <> p_company;
  delete from pg_members where device_id = v_dev and company <> p_company;
  insert into pg_devices (device_id, company, secret_hash) values (v_dev, p_company, v_hash)
  on conflict (device_id) do update set company = excluded.company, secret_hash = excluded.secret_hash;
  insert into pg_members (company, device_id, display_name, department, share_name)
  values (p_company, v_dev, v_name, v_dept, coalesce(p_share_name, false))
  on conflict (company, device_id) do update set
    display_name = excluded.display_name, department = excluded.department, share_name = excluded.share_name;
  return jsonb_build_object('ok', true, 'company', p_company,
                            'name', (select name from pg_companies where id = p_company),
                            'desk', _pg_desk_code(v_dev));
end;
$$;

create or replace function public.pg_me_leave(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_dev text := _pg_viewer(p_token);
begin
  if v_dev is null then return jsonb_build_object('ok', false, 'error', 'unpaired'); end if;
  delete from pg_desks   where device_id = v_dev;
  delete from pg_daily   where device_id = v_dev;
  delete from pg_members where device_id = v_dev;
  delete from pg_devices where device_id = v_dev;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.pg_me_unpair(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from pg_viewers where token_hash = _pg_sha(coalesce(p_token, ''));
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------- สิทธิ์ v3 ----------
revoke all on function public._pg_sha(text), public._pg_norm_code(text), public._pg_viewer(text),
  public._pg_clean_settings(jsonb) from public, anon, authenticated;
revoke all on function public.pg_unit_sync(jsonb), public.pg_pair(text), public.pg_me(text, integer),
  public.pg_me_settings(text, jsonb), public.pg_me_command(text, text),
  public.pg_me_join(text, text, text, text, text, boolean), public.pg_me_leave(text), public.pg_me_unpair(text) from public;
grant execute on function public.pg_unit_sync(jsonb), public.pg_pair(text), public.pg_me(text, integer),
  public.pg_me_settings(text, jsonb), public.pg_me_command(text, text),
  public.pg_me_join(text, text, text, text, text, boolean), public.pg_me_leave(text), public.pg_me_unpair(text)
  to anon, authenticated;
