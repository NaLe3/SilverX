default_admin_email = "admin@silverx.local"
default_admin_password = "changeme123!"
default_support_email = "support@silverx.local"
default_support_password = "support123!"

admin_email = ENV["ADMIN_EMAIL"].presence || (Rails.env.development? ? default_admin_email : nil)
admin_password = ENV["ADMIN_PASSWORD"].presence || (Rails.env.development? ? default_admin_password : nil)
support_email = ENV["SUPPORT_EMAIL"].presence || (Rails.env.development? ? default_support_email : nil)
support_password = ENV["SUPPORT_PASSWORD"].presence || (Rails.env.development? ? default_support_password : nil)

if admin_email.present? && admin_password.present?
  User.find_or_create_by!(email: admin_email) do |user|
    user.password = admin_password
    user.role = :admin
  end
  puts "Seeded admin: #{admin_email}"
end

if support_email.present? && support_password.present?
  User.find_or_create_by!(email: support_email) do |user|
    user.password = support_password
    user.role = :support
  end
  puts "Seeded support: #{support_email}"
end
