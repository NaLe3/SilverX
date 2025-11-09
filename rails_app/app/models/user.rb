class User < ApplicationRecord
  devise :database_authenticatable,
         :recoverable,
         :rememberable,
         :validatable

  enum :role, { admin: 0, support: 1 }

  validates :role, presence: true
end
