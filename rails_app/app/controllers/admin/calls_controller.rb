module Admin
  class CallsController < BaseController
    def index
      @calls = Call.order(created_at: :desc).limit(200).includes(:messages)
    end

    def show
      @call = Call.find(params[:id])
      @messages = @call.messages.order(created_at: :asc)
    end
  end
end
