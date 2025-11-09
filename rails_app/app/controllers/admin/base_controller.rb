module Admin
  class BaseController < ApplicationController
    before_action :authenticate_user!
    before_action :ensure_console_access!

    private

    def ensure_console_access!
      return if current_user&.admin? || current_user&.support?

      sign_out current_user if current_user
      redirect_to new_user_session_path, alert: "Accès console refusé."
    end

    def require_admin!
      return if current_user&.admin?

      redirect_to admin_calls_path, alert: "Action réservée aux administrateurs."
    end
  end
end
