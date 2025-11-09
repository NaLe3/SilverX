class Message < ApplicationRecord
  ROLES = %w[user assistant system tool].freeze

  belongs_to :call

  encrypts :content

  validates :role, presence: true, inclusion: { in: ROLES }
  validates :content, presence: true
  validates :metadata, presence: true
end
