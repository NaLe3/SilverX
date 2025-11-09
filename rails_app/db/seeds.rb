admin_email = ENV["ADMIN_EMAIL"]
admin_password = ENV["ADMIN_PASSWORD"]
support_email = ENV["SUPPORT_EMAIL"]
support_password = ENV["SUPPORT_PASSWORD"]

if admin_email.present? && admin_password.present?
  User.find_or_create_by!(email: admin_email) do |user|
    user.password = admin_password
    user.role = :admin
  end
end

if support_email.present? && support_password.present?
  User.find_or_create_by!(email: support_email) do |user|
    user.password = support_password
    user.role = :support
  end
end
