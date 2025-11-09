class Call < ApplicationRecord
  has_many :messages, dependent: :destroy

  validates :status, presence: true
end

