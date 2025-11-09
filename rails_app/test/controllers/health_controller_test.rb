require "test_helper"
require "minitest/mock"

class HealthControllerTest < ActionDispatch::IntegrationTest
  test "returns ok status when dependencies respond" do
    fake_redis = Class.new do
      def ping
        "PONG"
      end
    end.new

    Redis.stub(:new, fake_redis) do
      get "/health"
    end

    assert_response :success
    body = JSON.parse(@response.body)
    assert_equal "ok", body["status"]
    assert_equal "ok", body.dig("checks", "db")
    assert_equal "ok", body.dig("checks", "redis")
  end
end
