class ToolsController < ApplicationController
  skip_forgery_protection

  def dispatch
    tool = params[:tool].to_s
    payload = params[:payload].is_a?(ActionController::Parameters) ? params[:payload].to_unsafe_h : (params[:payload] || {})

    case tool
    when "echo"
      render json: { ok: true, tool:, result: { echo: payload } }, status: :ok
    when "sum"
      numbers = Array(payload["numbers"]).map(&:to_f)
      render json: { ok: true, tool:, result: { sum: numbers.sum } }, status: :ok
    else
      render json: { ok: false, error: "unknown_tool", tool: tool }, status: :bad_request
    end
  end
end

