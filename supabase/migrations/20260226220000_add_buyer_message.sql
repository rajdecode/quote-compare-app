-- Migration: Add missing buyer_message column to quote_responses to support counter offers
ALTER TABLE public.quote_responses
ADD COLUMN IF NOT EXISTS buyer_message TEXT;
