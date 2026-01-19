# Image Sync Scripts

Sync quiz images between local folder and Cloudflare R2 bucket.

## Setup

### 1. Install rclone

```bash
# Windows
winget install Rclone.Rclone

# Mac
brew install rclone

# Linux
curl https://rclone.org/install.sh | sudo bash
```

### 2. Create R2 API Token

1. Go to Cloudflare Dashboard → R2 → Overview
2. Click "Manage R2 API Tokens"
3. Create a token with read/write access to `trash-myx-images`
4. Copy the Access Key ID and Secret Access Key

### 3. Configure rclone

```bash
rclone config
```

Enter these values:
- **Name**: `r2`
- **Type**: `s3`
- **Provider**: `Cloudflare`
- **Access Key ID**: (from step 2)
- **Secret Access Key**: (from step 2)
- **Endpoint**: `https://<account_id>.r2.cloudflarestorage.com`

(Find your account ID in Cloudflare Dashboard URL or R2 settings)

## Usage

### PowerShell (Windows)

```powershell
cd scripts

# Check status
.\sync-images.ps1 status

# Download all images from R2
.\sync-images.ps1 pull

# After editing locally, push back to R2
.\sync-images.ps1 push

# Clean orphaned DB records
.\sync-images.ps1 sync

# Pull + sync in one command
.\sync-images.ps1 all
```

### Bash (Git Bash / WSL / Mac / Linux)

```bash
cd scripts
chmod +x sync-images.sh

# Check status
./sync-images.sh status

# Download all images from R2
./sync-images.sh pull

# After editing locally, push back to R2
./sync-images.sh push

# Clean orphaned DB records
./sync-images.sh sync

# Pull + sync in one command
./sync-images.sh all
```

## Workflow

### Delete images workflow:

1. **Pull**: `./sync-images.sh pull` - downloads images to `images-sandbox/quiz/`
2. **Edit**: Delete unwanted images in File Explorer
3. **Push**: `./sync-images.sh push` - uploads changes, deletes removed files from R2
4. **Sync**: `./sync-images.sh sync` - removes orphaned DB records

### Quick cleanup (R2 already changed):

If you deleted images directly from R2/Cloudflare Dashboard:

```bash
./sync-images.sh sync
```

This checks R2 vs DB and removes orphaned records.

## Files

- `images-sandbox/quiz/` - Local copy of quiz images
- `scripts/sync-images.ps1` - PowerShell script
- `scripts/sync-images.sh` - Bash script

## API Endpoints

The scripts use these admin endpoints:

- `GET /api/admin/sync` - Compare R2 and DB, find orphans
- `POST /api/admin/sync/cleanup` - Clean orphaned records
