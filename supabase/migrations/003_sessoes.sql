-- Rode DEPOIS de 003. Índices para sessões longas (login que permanece no aparelho).
create index if not exists sessions_discord_id_idx on sessions (discord_id);
create index if not exists sessions_expires_at_idx on sessions (expires_at);
