Simple implementation of [zola-theme-serene](https://github.com/isunjn/serene)'s anonymous reaction api endpoint.

Follow the instructions below to deploy your own endpoint.
All you need is a [Cloudflare](https://cloudflare.com) account.
The free tier is good enough for low-traffic sites, such as a personal blog.

## Stack

- Server Framework: [Hono](https://hono.dev)
- Server Environment: [Cloudflare Workers](https://workers.cloudflare.com)
- Database: [Cloudflare D1](https://developers.cloudflare.com/d1)

## Prerequisites

- A Cloudflare account
- Have `node` (alone with `npm` and `npx`) installed
- Have `pnpm` installed, you can install it by running `npm install -g pnpm`

## Instructions

1. Use this template to create a new repository of your own

2. Clone your repository to your local machine

3. Run `pnpm install`

4. Setup database
    - Run `npx wrangler d1 create reaction` to create the database
    - Then paste the output to `wrangler.toml`:
        ```toml
        [[d1_databases]]
        binding = "DB"
        database_name = "reaction"
        database_id = "<unique-ID-for-your-database>"
        ```
    - Run `npx wrangler d1 execute reaction --remote --file=./schema.sql` to initialize the database

5. Config the environment variables in `wrangler.toml`:
    ```toml
    [vars]
    ORIGINS = ["https://<your-username>.github.io"] # Your site's origins, can be more than one
    EMOJIS = ["👍", "👀", "😠"] # Default emojis for each post
    SLUGS = [ # Slugs of your every post
      "first-post", # For `https://<your-username>.github.io/blog/first-post/`, the slug is `first-post`
      "second-post",
      ["third-post", ["👍", "🥳", "😅", "😡"]], # You can also specify the emojis for each post
    ]
    ```

6. Deploy the worker
    - Run `pnpm run deploy`
    - Your deployed endpoint will be available at `https://reaction.<your-cloudflare-username>.workers.dev`

7. In your zola site's `config.toml`:
    ```toml
    reaction = false
    reaction_align = "right"
    reaction_endpoint = "https://reaction.<your-cloudflare-username>.workers.dev"
    ```
