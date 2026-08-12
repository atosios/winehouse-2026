FROM php:8.4-fpm-alpine

# Build deps for common PHP extensions, then the extensions Laravel needs
RUN apk add --no-cache \
      libpng-dev libjpeg-turbo-dev freetype-dev \
      libzip-dev icu-dev oniguruma-dev \
      $PHPIZE_DEPS \
  && docker-php-ext-configure gd --with-freetype --with-jpeg \
  && docker-php-ext-install -j"$(nproc)" \
      pdo_mysql mbstring bcmath gd zip intl opcache \
  && apk del $PHPIZE_DEPS

# Composer (from the official image)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# PHP tuning (opcache + realpath cache) — critical for bind-mount performance
COPY php.ini /usr/local/etc/php/conf.d/zz-winehouse.ini

WORKDIR /var/www/html
