# LifeOS - Personal Life Management System

A comprehensive personal life management application built with React, TypeScript, and Supabase.

## Features

- 📋 **Tasks Management** - Create, organize, and assign tasks with priorities and categories
- 📅 **Calendar Integration** - Sync with Google Calendar
- 💰 **Budget Tracking** - Track income, expenses, and budgets
- 🎯 **Goals** - Set and track personal and professional goals
- 📝 **Notes** - Secure note-taking with vault protection
- 👨‍👩‍👧‍👦 **Family Management** - Track family members, events, and documents
- 📊 **Habits** - Build and track daily habits
- 📈 **Investments** - Monitor your investment portfolio
- 💵 **Salary Tracking** - Track monthly salary and deductions

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Database, Edge Functions, Storage)
- **State**: React Query, React Context

## Development

### Prerequisites

- Node.js 18+ or Bun
- npm or bun package manager

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/lifeos.git
cd lifeos

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## Docker Deployment

### Quick Start with Docker Compose

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The app will be available at `http://localhost:8080`

### Manual Docker Build

```bash
# Build the image
docker build -t lifeos:latest .

# Run the container
docker run -d -p 8080:80 --name lifeos lifeos:latest

# View logs
docker logs -f lifeos

# Stop and remove
docker stop lifeos && docker rm lifeos
```

### Docker with Custom Environment

If you need to configure environment variables at build time:

```bash
# Build with build args
docker build \
  --build-arg VITE_SUPABASE_URL=your_url \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=your_key \
  -t lifeos:latest .
```

### Production Deployment with Docker

For production deployment with SSL, you can use the following `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  lifeos:
    build: .
    container_name: lifeos-app
    restart: unless-stopped
    environment:
      - VIRTUAL_HOST=your-domain.com
      - LETSENCRYPT_HOST=your-domain.com
      - LETSENCRYPT_EMAIL=your-email@example.com

  nginx-proxy:
    image: jwilder/nginx-proxy
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - certs:/etc/nginx/certs
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
    restart: unless-stopped

  letsencrypt:
    image: jrcs/letsencrypt-nginx-proxy-companion
    container_name: letsencrypt
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - certs:/etc/nginx/certs
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
    environment:
      - NGINX_PROXY_CONTAINER=nginx-proxy
    restart: unless-stopped

volumes:
  certs:
  vhost:
  html:
```

## Self-Hosting Guide

### Option 1: Docker (Recommended)

1. Clone the repository
2. Configure environment variables
3. Run `docker-compose up -d`

### Option 2: Static Hosting

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to any static hosting service:
   - Nginx
   - Apache
   - Netlify
   - Vercel
   - Cloudflare Pages

### Option 3: Node.js Server

1. Build the application:
   ```bash
   npm run build
   ```

2. Serve with a Node.js server:
   ```bash
   npx serve -s dist -l 3000
   ```

## Supabase Setup (Self-Hosted Backend)

If you want to self-host the backend as well:

1. Follow the [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting)

2. Run the migrations in the `supabase/migrations` folder

3. Deploy edge functions:
   ```bash
   supabase functions deploy
   ```

4. Update your environment variables to point to your self-hosted Supabase instance

## Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── contexts/       # React context providers
│   ├── hooks/          # Custom React hooks
│   ├── integrations/   # Third-party integrations
│   ├── lib/            # Utility functions
│   ├── pages/          # Page components
│   └── translations/   # i18n translations
├── supabase/
│   ├── functions/      # Edge functions
│   └── migrations/     # Database migrations
├── public/             # Static assets
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose configuration
└── nginx.conf          # Nginx configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details
