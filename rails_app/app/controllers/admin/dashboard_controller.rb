module Admin
  class DashboardController < BaseController
    def show
      @metrics = build_metrics
      @recent_calls = Call.order(created_at: :desc).limit(10).includes(:messages, :actions)
      @actions_by_kind = grouped_counts(Action, :kind)
      @actions_by_status = grouped_counts(Action, :status)
      @recent_failures = Action.where(status: "failed").order(updated_at: :desc).limit(5)
      @recent_messages = Message.order(created_at: :desc).limit(5).includes(:call)
    end

    private

    def build_metrics
      today = Time.zone.today
      {
        total_calls: Call.count,
        calls_today: Call.where("created_at >= ?", today.beginning_of_day).count,
        active_calls: Call.where(status: %w[inbound in_progress]).count,
        failed_calls: Call.where(status: "failed").count,
        actions_today: Action.where("created_at >= ?", today.beginning_of_day).count,
        avg_messages_per_call: average_messages_per_call
      }
    end

    def average_messages_per_call
      total = Call.count
      return 0 if total.zero?

      (Message.count.fdiv(total)).round(1)
    end

    def grouped_counts(model, column)
      model.group(column).order(Arel.sql("count_all DESC")).count
    end
  end
end
