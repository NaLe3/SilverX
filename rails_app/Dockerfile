FROM ruby:3.3 AS base

ENV RAILS_ENV=${RAILS_ENV:-development} \
    BUNDLE_PATH=/bundle \
    BUNDLE_BIN=/bundle/bin \
    BUNDLE_JOBS=4 \
    BUNDLE_RETRY=3

ENV PATH="$BUNDLE_BIN:$PATH"

WORKDIR /app

RUN apt-get update -qq \
  && apt-get install -y --no-install-recommends build-essential nodejs npm libpq-dev curl \
  && npm install -g yarn@1 \
  && rm -rf /var/lib/apt/lists/*

COPY Gemfile Gemfile.lock ./
RUN bundle config set without 'production' \
  && bundle install

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

CMD ["bin/rails", "server", "-b", "0.0.0.0"]
