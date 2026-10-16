-- Enforce review language moderation for both anonymous and authenticated writes.
create or replace function public.reject_inappropriate_review_comment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  normalized_comment text;
  blocked_word text;
  blocked_words text[] := array[
    'fuck', 'fucker', 'fucking', 'motherfucker', 'fck', 'shit', 'bullshit',
    'bitch', 'bitches', 'ass', 'asshole', 'arsehole', 'bastard', 'damn',
    'goddamn', 'cunt', 'dick', 'dickhead', 'pussy', 'cock', 'cum', 'whore',
    'slut', 'hoe', 'thot', 'jackass', 'crap', 'wtf', 'stfu', 'mf', 'nigga',
    'nigger', 'faggot', 'retard', 'sex', 'porn', 'nude', 'naked', 'horny',
    'blowjob', 'handjob', 'masturbate', 'orgasm', 'vagina', 'penis',
    'puta', 'pota', 'putangina', 'putang ina', 'putanginamo', 'putang ina mo',
    'p tangina', 'tangina', 'tang ina', 'tanginamo', 'gago', 'gaga', 'bobo',
    'boba', 'tanga', 'ulol', 'ulul', 'tarantado', 'kupal', 'pakyu', 'pak yu',
    'pakshet', 'pucha', 'letse', 'leche', 'lintik', 'bwisit', 'buwisit',
    'buwakanangina', 'kantot', 'kantutan', 'kantutin', 'jakol', 'jakulan',
    'puke', 'puki', 'titi', 'burat', 'bayag', 'iyot', 'libog', 'malibog',
    'hinayupak', 'hayop ka', 'siraulo', 'sira ulo', 'buwang'
  ];
begin
  if char_length(coalesce(new.comment, '')) > 1000 then
    raise exception 'Review comments must be 1,000 characters or fewer.'
      using errcode = '22001';
  end if;

  normalized_comment := lower(coalesce(new.comment, ''));
  normalized_comment := translate(normalized_comment, '01345@$!', 'oieasasi');
  normalized_comment := regexp_replace(normalized_comment, '[^a-z0-9]+', ' ', 'g');
  normalized_comment := regexp_replace(normalized_comment, '([aeiou])\1+', '\1', 'g');
  normalized_comment := regexp_replace(normalized_comment, '([b-df-hj-np-tv-z])\1{2,}', '\1\1', 'g');
  normalized_comment := ' ' || btrim(normalized_comment) || ' ';

  foreach blocked_word in array blocked_words loop
    if position(' ' || blocked_word || ' ' in normalized_comment) > 0 then
      raise exception 'Review contains inappropriate language. Please keep it respectful.'
        using errcode = '22023';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists reject_inappropriate_review_comment on public.reviews;
create trigger reject_inappropriate_review_comment
before insert or update of comment on public.reviews
for each row execute function public.reject_inappropriate_review_comment();
