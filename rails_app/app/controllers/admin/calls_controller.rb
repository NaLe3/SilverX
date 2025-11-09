module Admin
  class CallsController < BaseController
    RANGE_OPTIONS = {
      "1h" => "Dernière heure",
      "24h" => "24 heures",
      "7d" => "7 jours",
      "30d" => "30 jours",
      "all" => "Tout l'historique"
    }.freeze

    helper_method :range_options

    def index
      scope = Call.includes(:messages, :actions).order(created_at: :desc)

      @query = params[:q].to_s.strip
      @status = params[:status].presence
      @range = params[:range].presence || "24h"

      scope = scope.where("external_id ILIKE ?", "%#{@query}%") if @query.present?
      scope = scope.where(status: @status) if @status.present? && Call::STATUSES.include?(@status)
      scope = scope.where("calls.created_at >= ?", time_range_start(@range)) if time_range_start(@range)

      @calls = scope.limit(200)
      @status_counts = Call.group(:status).count

      respond_to do |format|
        format.html
        format.turbo_stream { render partial: "admin/calls/table", locals: { calls: @calls } }
      end
    end

    def show
      @call = Call.find(params[:id])
      @messages = @call.messages.order(created_at: :asc)
    end

    private

    def time_range_start(token)
      case token
      when "1h" then 1.hour.ago
      when "24h" then 24.hours.ago
      when "7d" then 7.days.ago
      when "30d" then 30.days.ago
      else
        nil
      end
    end

    def range_options
      RANGE_OPTIONS
    end
  end
end
