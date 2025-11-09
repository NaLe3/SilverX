class Action < ApplicationRecord
  belongs_to :call

  KINDS = %w[lookup escalate notify tool_call].freeze
  STATUSES = %w[pending running completed failed].freeze

  encrypts :payload, type: :json, deterministic: false

  validates :kind, presence: true, inclusion: { in: KINDS }
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :payload, presence: true
  validates :metadata, presence: true
  validates :result, presence: true
end
