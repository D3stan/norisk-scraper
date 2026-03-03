

# Configuration - EDIT THESE VALUES
VPS="norisk"
TARGET_DIR="~/norisk-scraper"
ARCHIVE_NAME="norisk-scraper-deploy.tar.gz"

echo "📦 Creating archive (excluding node_modules, .git, and storage)..."
tar --exclude="node_modules" --exclude=".git" --exclude="storage" --exclude="logs" --exclude="screenshots" --exclude="norisk-wordpress" -czf $ARCHIVE_NAME .

echo "🚀 Uploading to VPS ($VPS)..."
# Create target directory if it doesn't exist and upload
ssh $VPS "mkdir -p $TARGET_DIR"
scp $ARCHIVE_NAME $VPS:$TARGET_DIR/

echo "📂 Extracting on VPS and cleaning up..."
ssh $VPS "cd $TARGET_DIR && tar -xzf $ARCHIVE_NAME && rm $ARCHIVE_NAME"

echo "🧹 Cleaning up local archive..."
rm $ARCHIVE_NAME

echo "✅ Done! Files uploaded to $VPS:$TARGET_DIR"
echo "Next steps: SSH into your VPS and run 'docker-compose up -d --build'"
