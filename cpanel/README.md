# LifeOS – cPanel Deployment Guide

## Prerequisites

- cPanel hosting with **Node.js Selector** (Node.js 18+)
- SSH access or cPanel Terminal
- MySQL database access

## Quick Install

### 1. Upload Files

Upload the LifeOS project files to your `public_html` directory (or a subdirectory).

### 2. Create MySQL Database

1. Go to **cPanel → MySQL Databases**
2. Create a new database (e.g., `lifeos`)
3. Create a new user (e.g., `lifeos`) with a strong password
4. Add the user to the database with **ALL PRIVILEGES**

> **Note:** cPanel prefixes names with your username. If your cPanel username is `arif`, the full database name will be `arif_lifeos` and the user will be `arif_lifeos`.

### 3. Run Install Script

```bash
# SSH into your server
ssh user@yourdomain.com

# Navigate to the app directory
cd ~/public_html

# Run the installer
bash cpanel/install.sh
```

The script will:
- Ask for your database credentials
- Generate a secure JWT secret
- Create the `.env` configuration file
- Create `.htaccess` rewrite rules
- Build the frontend
- Create a startup script

### 4. Set Up Node.js App

#### Option A: cPanel Node.js Selector (Recommended)
1. Go to **cPanel → Setup Node.js App**
2. Click **Create Application**
3. Set:
   - Node.js version: `18` or higher
   - Application mode: `Production`
   - Application root: your app directory (e.g., `public_html`)
   - Application startup file: `docker/backend/server.js`
4. Click **Create**

#### Option B: Manual with Cron Job
Add a cron job in cPanel:
```
@reboot cd ~/public_html && bash start-backend.sh >> ~/lifeos.log 2>&1
```

### 5. Complete Setup

Visit your domain in a browser. The setup wizard will guide you through:
1. Selecting **cPanel / Hosting** deployment type
2. Entering your database credentials (with cPanel prefix support)
3. Creating an admin account

## File Structure

```
public_html/
├── .env              # Auto-generated config
├── .htaccess         # Apache rewrite rules
├── start-backend.sh  # Backend startup script
├── dist/             # Built frontend files
├── docker/
│   └── backend/
│       └── server.js # Node.js API server
└── cpanel/
    ├── install.sh    # Installation script
    └── README.md     # This file
```

## Troubleshooting

### API returns 404
- Ensure `.htaccess` has `RewriteEngine On`
- Check that `mod_rewrite` and `mod_proxy` are enabled
- Verify the Node.js backend is running on port 3001

### Database connection fails
- Verify database name includes cPanel prefix
- Check user privileges in cPanel → MySQL Databases
- Ensure `localhost` is the correct host (some hosts use `127.0.0.1`)

### Node.js not starting
- Check Node.js version: `node --version` (must be 18+)
- Check logs: `tail -f ~/lifeos.log`
- Ensure `mysql2` package is installed: `npm install mysql2`

## XAMPP Alternative

If you prefer XAMPP on a local machine:
1. Start Apache and MySQL from XAMPP Control Panel
2. Create a `lifeos` database in phpMyAdmin
3. Run the setup wizard and select **XAMPP / Local**
4. Use `root` as the username (usually no password for XAMPP)
