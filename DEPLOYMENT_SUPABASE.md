# Supabase Deployment Guide

## 1. Local Development (Optional)
If you want to run the database locally:
1.  **Start Supabase**: `npx supabase start` (Requires Docker).
2.  **Apply Migrations**: `npx supabase db reset`.

## 2. Deploy to Production
To push your local schema (tables) to the live Supabase project:

1.  **Login**:
    ```bash
    npx supabase login
    ```
    *(This will open your browser to authenticate)*

2.  **Link Project**:
    ```bash
    npx supabase link --project-ref ilichjxywepoedtzfvyj
    ```
    *(Enter your database password if prompted)*

3.  **Push Schema**:
    ```bash
    npx supabase db push
    ```
    *(This applies the migration file in `supabase/migrations` to your production DB)*

## 3. Verify
Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/ilichjxywepoedtzfvyj/editor) and check the **Table Editor**. You should see:
-   `profiles`
-   `quotes`
-   `quote_responses`
