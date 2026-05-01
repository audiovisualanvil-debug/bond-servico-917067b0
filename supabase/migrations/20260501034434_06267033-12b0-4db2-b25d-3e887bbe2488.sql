-- Desbanir no Auth
update auth.users
set banned_until = null
where email = 'vita.faztudo@gmail.com';

-- Garantir role admin
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'vita.faztudo@gmail.com'
on conflict do nothing;
