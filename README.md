# HexCrawl Map Tracker

A collaborative, browser-based hex map for tabletop RPG groups. Features fog of war, terrain, POIs, factions, dangers, DM secrets, and more.

---

## Running Locally (for testing)

### Prerequisites
- [Node.js](https://nodejs.org) v18 or higher (download and install from nodejs.org)

### Steps

1. **Install dependencies:**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

2. **Build the frontend:**
   ```bash
   npm run build
   ```

3. **Set your passwords** (optional for local testing):
   
   On Mac/Linux:
   ```bash
   export PLAYER_PASSWORD=yourplayerpassword
   export DM_PASSWORD=yourdmpassword
   ```
   
   On Windows (Command Prompt):
   ```cmd
   set PLAYER_PASSWORD=yourplayerpassword
   set DM_PASSWORD=yourdmpassword
   ```
   
   If you skip this, defaults are: player=`player123`, dm=`dm456`

4. **Start the server:**
   ```bash
   npm start
   ```

5. Open your browser to `http://localhost:3000`

---

## Deploying to Render.com (Recommended for Beginners)

Render.com is the easiest option — free tier, no credit card needed for basic use.

### Step-by-Step

1. **Push your code to GitHub:**
   - Create a free account at [github.com](https://github.com)
   - Create a new repository (click the "+" button, then "New repository")
   - Follow GitHub's instructions to push this folder to your repository

2. **Create a Render account:**
   - Go to [render.com](https://render.com) and sign up (free)
   - Click "New +" → "Web Service"
   - Connect your GitHub account and select your hexcrawl repository

3. **Configure the service:**
   - **Name:** anything you like (e.g. `my-hexcrawl`)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server/index.js`

4. **Add environment variables** (in the Render dashboard under "Environment"):
   | Key | Value |
   |-----|-------|
   | `PLAYER_PASSWORD` | your chosen player password |
   | `DM_PASSWORD` | your chosen DM password |
   | `DB_PATH` | `/data/hexcrawl.db` |
   | `PORT` | `3000` |

5. **Add a Disk** (for persistent data storage):
   - In Render, go to your service → "Disks" tab
   - Add a disk: Name = `hexcrawl-data`, Mount Path = `/data`, Size = 1 GB
   - **This is important!** Without a disk, your map data resets every time the server restarts.

6. Click **Deploy**. Render will build and launch your app. In a few minutes you'll get a URL like `https://my-hexcrawl.onrender.com`.

---

## Deploying to Fly.io (Alternative)

Fly.io has a generous free tier and faster servers.

### Prerequisites
- Install the Fly CLI: follow instructions at [fly.io/docs/hands-on/install-flyctl](https://fly.io/docs/hands-on/install-flyctl/)

### Step-by-Step

1. **Sign up and log in:**
   ```bash
   fly auth signup
   # or if you have an account:
   fly auth login
   ```

2. **Edit `fly.toml`:** Open the `fly.toml` file and change `"your-app-name"` to a unique name (e.g. `my-hexcrawl-map`). App names must be globally unique on Fly.io.

3. **Launch the app:**
   ```bash
   fly launch --no-deploy
   ```
   When prompted, say "yes" to use the existing `fly.toml`.

4. **Create a persistent volume** (for the database):
   ```bash
   fly volumes create hexcrawl_data --size 1 --region iad
   ```

5. **Set your passwords:**
   ```bash
   fly secrets set PLAYER_PASSWORD=yourplayerpassword DM_PASSWORD=yourdmpassword
   ```

6. **Deploy:**
   ```bash
   fly deploy
   ```
   
   This builds and deploys your app. You'll get a URL like `https://my-hexcrawl-map.fly.dev`.

7. **Check logs** if anything goes wrong:
   ```bash
   fly logs
   ```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PLAYER_PASSWORD` | Password for players | `player123` |
| `DM_PASSWORD` | Password for the DM (grants access to secrets) | `dm456` |
| `PORT` | Server port | `3000` |
| `DB_PATH` | Path to SQLite database file | `./hexcrawl.db` |

**Important:** Change the default passwords before sharing the app with anyone!

---

## Sharing with Your Group

Once deployed, share the URL with your players. They use the player password to access the map. You use the DM password to see and edit secret fields.

No user accounts are needed — passwords are all that's required.

---

## Backing Up Your Data

The entire map is stored in a single SQLite file (`hexcrawl.db`). You can:

- **Export from the app:** Use the hamburger menu (☰) → Export as JSON or CSV
- **Download the database file directly** from your Render disk or Fly volume

---

## Updating the App

If you make changes to the code:

**Render.com:** Push to GitHub — Render auto-deploys on every push.

**Fly.io:** Run `fly deploy` again from the project folder.
