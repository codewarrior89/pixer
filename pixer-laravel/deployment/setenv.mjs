#!/usr/bin/env zx

import chalk from 'chalk';
import pkg from 'enquirer'; // Import enquirer as a default export
const { prompt } = pkg; // Destructure prompt

console.log(chalk.green('Started Setup Server'));

// Step 1 - Installing Nginx
console.log(chalk.blue('#Step 1 - Installing Nginx'));
console.log('Running: sudo apt update...');
await $`sudo apt update`;

console.log("Adding ppa:ondrej/php...");
await $`sudo add-apt-repository ppa:ondrej/php`;
await $`sudo apt update`;

console.log('Running: sudo apt install nginx...');
await $`sudo apt install nginx`;

// Step 2: Adjusting the Firewall
console.log(chalk.blue('#Step 2: Adjusting the Firewall'));
console.log('Checking ufw app list...');
await $`sudo ufw app list`;

console.log('Adding SSH to the firewall...');
await $`sudo ufw allow ssh`;
await $`sudo ufw allow OpenSSH`;

console.log('Enabling Nginx on the firewall...');
await $`sudo ufw allow 'Nginx HTTP'`;

console.log('Enabling the firewall...');
await $`sudo ufw enable`;
await $`sudo ufw default deny`;

console.log('Checking the changes status...');
await $`sudo ufw status`;

// Step 3 – Checking your Web Server
console.log(chalk.blue('#Step 3 – Checking your Web Server'));
console.log('Checking the status of Nginx...');
await $`systemctl status nginx`;

// Step 4 - Install PHP
console.log(chalk.blue('#Step 4 - Install PHP'));
await $`sudo apt install php8.1-fpm php8.1-mysql`;
await $`sudo apt install php8.1-mbstring php8.1-xml php8.1-bcmath php8.1-simplexml php8.1-intl php8.1-gd php8.1-curl php8.1-zip php8.1-gmp`;

// Step 5 - Install Composer
console.log(chalk.blue('#Step 5 - Install Composer'));
await $`sudo apt install php-cli unzip`;
await $`curl -sS https://getcomposer.org/installer -o composer-setup.php`;
const HASH = await $`curl -sS https://composer.github.io/installer.sig`;

await $`php -r "if (hash_file('SHA384', 'composer-setup.php') === '${HASH.stdout.trim()}') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"`;
await $`php composer-setup.php`;
await $`php -r "unlink('composer-setup.php');"`;
await $`sudo mv composer.phar /usr/bin/composer`;

// Step 6 - Install MySQL
console.log(chalk.blue('#Step 6 - Install MySQL'));
await $`sudo apt install mysql-server`;

// Step 7: Setting Up Server & Project
const { domainName } = await prompt({
  type: 'input',
  name: 'domainName',
  message: 'What is your domain name?'
});

const { email } = await prompt({
  type: 'input',
  name: 'email',
  message: 'What is your email address for Let\'s Encrypt notifications?'
});

console.log(chalk.green(`Your domain name is: ${domainName}\n`));

await $`sudo rm -f /etc/nginx/sites-enabled/pixer`;
await $`sudo rm -f /etc/nginx/sites-available/pixer`;
await $`sudo touch /etc/nginx/sites-available/pixer`;
await $`sudo chmod 644 /etc/nginx/sites-available/pixer`; // More restrictive permissions

console.log(chalk.blue('Settings Running For REST API'));

await $`sudo bash -c 'echo "server {
    listen 80;

    server_name ${domainName};

    client_max_body_size 256M;
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    index index.html index.htm index.php;

    charset utf-8;

    # For API
    location /backend {
        alias /var/www/pixer-laravel/pixer-api/public;
        try_files $uri $uri/ @backend;

        location ~ \\.php$ {
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME $request_filename;
            fastcgi_pass unix:/run/php/php8.1-fpm.sock;
        }
    }

    location @backend {
        rewrite /backend/(.*)$ /backend/index.php?/$1 last;
    }

    # For FrontEnd
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /admin {
        proxy_pass http://localhost:3002/admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    error_page 404 /index.php;

    location ~ \\.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\\.(?!well-known).* {
        deny all;
    }
}" > /etc/nginx/sites-available/pixer'`;

console.log(chalk.blue('\nEnabling the config'));
await $`sudo ln -s /etc/nginx/sites-available/pixer /etc/nginx/sites-enabled/`;

// Check for Nginx errors
await $`sudo nginx -t`;
await $`sudo systemctl restart nginx`;

// Step 8 - Securing Nginx with Let's Encrypt
console.log(chalk.blue('Securing Nginx with Let\'s Encrypt'));
await $`sudo apt install certbot python3-certbot-nginx`;
await $`sudo ufw allow 'Nginx Full'`;
await $`sudo ufw delete allow 'Nginx HTTP'`;
await $`sudo certbot --nginx -d ${domainName} --email ${email} --agree-tos --no-eff-email --redirect`;

console.log(chalk.green('Nginx Setup success!'));
