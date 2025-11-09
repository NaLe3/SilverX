class Message < ApplicationRecord
  belongs_to :call

  validates :role, presence: true
  validates :content, presence: true
end

