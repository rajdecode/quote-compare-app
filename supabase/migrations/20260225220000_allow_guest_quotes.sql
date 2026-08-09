-- Enable guests to insert quotes (buyer_id is null)
create policy "Guests can insert quotes."
  on quotes for insert
  with check ( auth.uid() is null and buyer_id is null );
