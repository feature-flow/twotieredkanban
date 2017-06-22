create or replace function extract_text(class_name text, state jsonb)
  returns tsvector
as $$
declare
  text text;
  v tsvector;
  r record;
begin
  if state is null then return null; end if;

  text := coalesce(state ->> 'title', '');
  v := setweight(to_tsvector('english', text), 'A');

  text := coalesce(state ->> 'description', '');
  v := v || setweight(to_tsvector('english', text), 'B');

  if class_name = 'twotieredkanban.board.Task' then
    for r in select * from jsonb_array_elements(state->'task_texts') loop
      text := coalesce(r.value ->> 'title', '');
      v := v || setweight(to_tsvector('english', text), 'B');

      text := coalesce(r.value ->> 'description', '');
      v := v || setweight(to_tsvector('english', text), 'C');
    end loop;
  end if;

  return v;
end
$$ language plpgsql immutable cost 999;

create index ff_text_idx on newt using gin ((extract_text(class_name, state)));

create index ff_archived_idx on newt ((state -> 'history' -> -1 -> 'archived'));
