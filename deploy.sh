#!/bin/bash

# ===========================================
# Track アプリケーション デプロイスクリプト
# ConoHa VPS (Ubuntu/Debian) 用
# ===========================================

set -e  # エラー時に停止

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 設定
APP_NAME="track"
APP_DIR="/var/www/track"
NODE_VERSION="20"
DOMAIN=""

# 引数チェック
while getopts "d:" opt; do
  case $opt in
    d) DOMAIN="$OPTARG" ;;
    *) echo "Usage: $0 [-d domain.com]"; exit 1 ;;
  esac
done

# ===========================================
# 1. システム更新とNode.jsインストール
# ===========================================
install_nodejs() {
    echo_info "Node.js ${NODE_VERSION} をインストール中..."

    # NodeSourceリポジトリを追加
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -

    # Node.jsインストール
    sudo apt-get install -y nodejs

    # バージョン確認
    echo_info "Node.js $(node -v) インストール完了"
    echo_info "npm $(npm -v) インストール完了"
}

# ===========================================
# 2. PostgreSQLインストールと設定
# ===========================================
install_postgresql() {
    echo_info "PostgreSQLをインストール中..."

    sudo apt-get install -y postgresql postgresql-contrib

    # PostgreSQLを起動
    sudo systemctl start postgresql
    sudo systemctl enable postgresql

    echo_info "PostgreSQLインストール完了"
}

setup_database() {
    echo_info "データベースをセットアップ中..."

    # データベースとユーザー作成
    sudo -u postgres psql << EOF
-- ユーザー作成（パスワードは後で変更してください）
CREATE USER track_user WITH PASSWORD 'track_password_change_me';

-- データベース作成
CREATE DATABASE track_db OWNER track_user;

-- 権限付与
GRANT ALL PRIVILEGES ON DATABASE track_db TO track_user;
EOF

    echo_warn "データベースパスワードを変更してください！"
    echo_warn "sudo -u postgres psql -c \"ALTER USER track_user WITH PASSWORD 'your_secure_password';\""
}

# ===========================================
# 3. Nginxインストールと設定
# ===========================================
install_nginx() {
    echo_info "Nginxをインストール中..."

    sudo apt-get install -y nginx

    sudo systemctl start nginx
    sudo systemctl enable nginx

    echo_info "Nginxインストール完了"
}

configure_nginx() {
    if [ -z "$DOMAIN" ]; then
        echo_warn "ドメインが指定されていません。手動でNginx設定を行ってください。"
        return
    fi

    echo_info "Nginx設定をコピー中..."

    # 設定ファイルをコピー
    sudo cp ${APP_DIR}/nginx.conf.example /etc/nginx/sites-available/${APP_NAME}

    # ドメイン名を置換
    sudo sed -i "s/your-domain.com/${DOMAIN}/g" /etc/nginx/sites-available/${APP_NAME}

    # シンボリックリンク作成
    sudo ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/

    # デフォルト設定を無効化
    sudo rm -f /etc/nginx/sites-enabled/default

    # 設定テスト
    sudo nginx -t

    # Nginx再起動
    sudo systemctl reload nginx

    echo_info "Nginx設定完了"
}

# ===========================================
# 4. SSL証明書取得（Let's Encrypt）
# ===========================================
setup_ssl() {
    if [ -z "$DOMAIN" ]; then
        echo_warn "ドメインが指定されていません。SSL設定をスキップします。"
        return
    fi

    echo_info "Let's Encrypt証明書を取得中..."

    # Certbotインストール
    sudo apt-get install -y certbot python3-certbot-nginx

    # 証明書取得
    sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN}

    # 自動更新設定確認
    sudo certbot renew --dry-run

    echo_info "SSL証明書設定完了"
}

# ===========================================
# 5. PM2インストール
# ===========================================
install_pm2() {
    echo_info "PM2をインストール中..."

    sudo npm install -g pm2

    # PM2を起動時に自動起動
    pm2 startup systemd -u $USER --hp $HOME

    echo_info "PM2インストール完了"
}

# ===========================================
# 6. アプリケーションセットアップ
# ===========================================
setup_application() {
    echo_info "アプリケーションをセットアップ中..."

    # ディレクトリ作成
    sudo mkdir -p ${APP_DIR}
    sudo chown -R $USER:$USER ${APP_DIR}

    # ログディレクトリ作成
    sudo mkdir -p /var/log/pm2
    sudo chown -R $USER:$USER /var/log/pm2

    echo_info "アプリケーションディレクトリ: ${APP_DIR}"
    echo_warn "ソースコードをこのディレクトリにコピーしてください"
}

build_application() {
    echo_info "アプリケーションをビルド中..."

    cd ${APP_DIR}

    # 依存関係インストール
    npm ci --production=false

    # Prismaクライアント生成
    npx prisma generate

    # データベースマイグレーション
    npx prisma migrate deploy

    # 本番ビルド
    npm run build

    echo_info "ビルド完了"
}

start_application() {
    echo_info "アプリケーションを起動中..."

    cd ${APP_DIR}

    # PM2で起動
    pm2 start ecosystem.config.js

    # PM2設定を保存
    pm2 save

    echo_info "アプリケーション起動完了"
}

# ===========================================
# メイン処理
# ===========================================
main() {
    echo_info "=== Track デプロイスクリプト ==="
    echo ""

    # システム更新
    echo_info "システムを更新中..."
    sudo apt-get update
    sudo apt-get upgrade -y

    # 必要なパッケージをインストール
    sudo apt-get install -y curl git build-essential

    # 各コンポーネントをインストール
    install_nodejs
    install_postgresql
    setup_database
    install_nginx
    install_pm2
    setup_application

    echo ""
    echo_info "=== 基本セットアップ完了 ==="
    echo ""
    echo_warn "次のステップ:"
    echo "1. ソースコードを ${APP_DIR} にコピー"
    echo "2. .env.production を作成（.env.production.example を参考に）"
    echo "3. データベースパスワードを変更"
    echo "4. 以下のコマンドでビルドと起動:"
    echo "   cd ${APP_DIR}"
    echo "   npm ci"
    echo "   npx prisma generate"
    echo "   npx prisma migrate deploy"
    echo "   npm run build"
    echo "   pm2 start ecosystem.config.js"
    echo ""

    if [ -n "$DOMAIN" ]; then
        configure_nginx
        setup_ssl
        echo_info "https://${DOMAIN} でアクセス可能です"
    else
        echo_warn "Nginx設定とSSL証明書は手動で設定してください"
        echo "   ./deploy.sh -d your-domain.com"
    fi
}

# 引数でコマンドを指定可能
case "${1:-}" in
    nodejs)
        install_nodejs
        ;;
    postgresql)
        install_postgresql
        setup_database
        ;;
    nginx)
        install_nginx
        configure_nginx
        ;;
    ssl)
        setup_ssl
        ;;
    pm2)
        install_pm2
        ;;
    build)
        build_application
        ;;
    start)
        start_application
        ;;
    *)
        main
        ;;
esac
