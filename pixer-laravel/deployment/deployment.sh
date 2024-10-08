#!/bin/bash

echo "Enter your server username (e.g. ubuntu):"
read USERNAME

echo "Enter your server IP address (e.g. 3.110.50.121):"
read IP_ADDRESS

echo "Enter the path to your PEM key file:"
read PEM_KEY_PATH

# Change permissions of private key file
chmod 0600 "${PEM_KEY_PATH}"

echo "########### connecting to server... ###########"
echo "${USERNAME}"
echo "${IP_ADDRESS}"

# Create directories and install zip and unzip on the server
ssh -i "${PEM_KEY_PATH}" -o StrictHostKeyChecking=no "${USERNAME}@${IP_ADDRESS}" "sudo mkdir -p /var/www/pixer-laravel;sudo chown -R \$USER:\$USER /var/www; sudo apt install zip unzip"

if [ -d "./pixer-api" ]; then
  echo 'Zipping pixer-api folder'
  zip -r ./pixer-api.zip ./pixer-api
fi

if [ -d "./deployment" ]; then
  echo 'Zipping deployment folder'
  zip -r ./deployment.zip ./deployment
fi

if [ -f "./pixer-api.zip" ] && [ -f "./deployment.zip" ]; then
  echo "Uploading pixer-api.zip to server"
  scp -i "${PEM_KEY_PATH}" "./pixer-api.zip" "${USERNAME}@${IP_ADDRESS}:/var/www/pixer-laravel"
  echo "uploaded pixer-api.zip to server"
  ssh -i "${PEM_KEY_PATH}" -o StrictHostKeyChecking=no "${USERNAME}@${IP_ADDRESS}" "unzip /var/www/pixer-laravel/pixer-api.zip -d /var/www/pixer-laravel"

  echo 'Uploading deployment.zip to server...'
  scp -i "${PEM_KEY_PATH}" "./deployment.zip" "${USERNAME}@${IP_ADDRESS}:/var/www/pixer-laravel"
  echo 'uploaded deployment.zip to server'
  ssh -i "${PEM_KEY_PATH}" -o StrictHostKeyChecking=no "${USERNAME}@${IP_ADDRESS}" "unzip /var/www/pixer-laravel/deployment.zip -d /var/www/pixer-laravel"
else
  echo "pixer-api and deployment zip file missing"
fi

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "installing google zx for further script"
nvm use 18.17.0
npm install -g npm@latest
npm i -g zx

echo "Congrats, All the deployment script and api files uploaded to the server."