require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "defaults to support role" do
    user = User.create!(email: "default-role@example.com", password: "password123!")
    assert user.support?
  end

  test "admin role predicate works" do
    user = User.create!(email: "admin-role@example.com", password: "password123!", role: :admin)
    assert user.admin?
  end
end
