/*
  # Add clientId to appointments table

  1. Changes
    - Add `client_id` column to `appointments` table
*/

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_id uuid;