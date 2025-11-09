module ApplicationHelper
  def nav_link_to(name, path, **options)
    classes = Array(options.delete(:class)) + %w[inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold transition-colors]
    classes << if current_page?(path)
                 "bg-slate-900 text-white shadow shadow-slate-400/30"
               else
                 "text-slate-600 hover:text-slate-900 hover:bg-white/60"
               end
    link_to name, path, { class: classes.join(" ") }.merge(options)
  end

  def environment_badge
    env = Rails.env
    return if env.production?

    color = env.development? ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
    content_tag :span, env.upcase, class: "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold #{color}"
  end

  def user_initials(user)
    return "?" unless user

    names = user.email.split("@").first.split(/[._]/).reject(&:blank?)
    letters = names.first(2).map { |part| part[0]&.upcase }.join
    letters.presence || user.email.first.upcase
  end
end
