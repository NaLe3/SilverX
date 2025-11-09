require "redis"

class HealthController < ApplicationController
  def index
    checks = {
      db: check_database,
      redis: check_redis
    }

    status = checks.values.all? { |result| result == "ok" } ? :ok : :service_unavailable

    render json: { status: status == :ok ? "ok" : "degraded", checks: checks }, status: status
  end

  private

  def check_database
    ActiveRecord::Base.connection.execute("SELECT 1")
    "ok"
  rescue StandardError => e
    Rails.logger.error("healthcheck database error: #{e.class} #{e.message}")
    "error"
  end

  def check_redis
    Redis.new(url: redis_url).ping
    "ok"
  rescue StandardError => e
    Rails.logger.error("healthcheck redis error: #{e.class} #{e.message}")
    "error"
  end

  def redis_url
    ENV.fetch("REDIS_URL", "redis://localhost:6379/0")
  end
end
