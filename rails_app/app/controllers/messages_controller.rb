class MessagesController < ApplicationController
  skip_forgery_protection

  before_action :load_call

  def index
    messages = @call.messages.order(created_at: :asc)
    render json: messages.as_json(only: %i[id role content metadata created_at updated_at], methods: [])
  end

  def create
    message = @call.messages.build(message_params)
    if message.save
      render json: message.as_json(only: %i[id role content metadata created_at updated_at]), status: :created
    else
      render json: { errors: message.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def load_call
    @call = Call.find(params[:call_id])
  end

  def message_params
    params.permit(:role, :content, metadata: {})
  end
end

