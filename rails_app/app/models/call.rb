class Call < ApplicationRecord
  has_many :messages, dependent: :destroy
  has_many :actions, dependent: :destroy

  STATUSES = %w[new inbound in_progress completed failed archived].freeze

  encrypts :customer_name
  encrypts :customer_email
  encrypts :customer_phone, deterministic: true

  validates :external_id, presence: true, uniqueness: true
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :customer_email, allow_blank: true, format: { with: URI::MailTo::EMAIL_REGEXP }
end
