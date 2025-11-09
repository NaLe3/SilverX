class CallsController < ApplicationController
  skip_forgery_protection

  def index
    calls = Call.order(created_at: :desc).limit(100)
    render json: calls.as_json(only: %i[id external_id status metadata created_at updated_at])
  end

  def show
    call = Call.find(params[:id])
    render json: call.as_json(only: %i[id external_id status metadata created_at updated_at])
  end

  def create
    call = Call.new(call_params)
    if call.save
      render json: call.as_json(only: %i[id external_id status metadata created_at updated_at]), status: :created
    else
      render json: { errors: call.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def call_params
    params.permit(:external_id, :status, metadata: {})
  end
end

