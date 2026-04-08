INSERT INTO properties (id, imobiliaria_id, address, neighborhood, city, state)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', '129a8b7a-4dee-47bb-8b80-6983aefef17d', 'Rua Teste QA 123', 'Centro', 'São Paulo', 'SP');

INSERT INTO service_orders (id, os_number, property_id, imobiliaria_id, problem, urgency, requester_name, status)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'OS-TEST-001', 'aaaaaaaa-0000-0000-0000-000000000001', '129a8b7a-4dee-47bb-8b80-6983aefef17d', 'Vazamento no banheiro - Teste QA', 'media', 'QA Tester', 'aguardando_orcamento_prestador');