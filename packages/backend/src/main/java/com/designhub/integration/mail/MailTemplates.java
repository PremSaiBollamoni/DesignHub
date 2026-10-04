package com.designhub.integration.mail;

import com.designhub.integration.mail.MailService.Mail;

/** Plain, readable emails with one clear button. */
public final class MailTemplates {
    private MailTemplates() {}

    private static String esc(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String layout(String heading, String body, String quote, String button, String link) {
        return "<div style=\"font-family:Inter,Arial,sans-serif;background:#f7f5f0;padding:32px\">"
                + "<div style=\"max-width:520px;margin:auto;background:#fff;border:1px solid #ddd9d1;border-radius:12px;padding:28px\">"
                + "<div style=\"font-weight:800;font-size:18px;color:#151515;margin-bottom:18px\">DesignHub</div>"
                + "<h1 style=\"font-size:20px;margin:0 0 10px;color:#151515\">" + esc(heading) + "</h1>"
                + "<p style=\"color:#62605b;line-height:1.5;margin:0 0 16px\">" + body + "</p>"
                + (quote == null || quote.isBlank() ? "" : "<blockquote style=\"margin:0 0 20px;padding:10px 14px;border-left:3px solid #ff5a36;background:#fff0ea;color:#151515\">" + esc(quote) + "</blockquote>")
                + "<a href=\"" + link + "\" style=\"display:inline-block;background:#ff5a36;color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:8px\">" + esc(button) + "</a>"
                + "</div></div>";
    }

    public static Mail approvalNeeded(String to, String name, String maker, String title, String team, String note, String link) {
        return new Mail(to, name, "Approval needed: " + title,
                maker + " sent \"" + title + "\" (" + team + ") for your approval.\n" + (note == null || note.isBlank() ? "" : "\nNote: " + note + "\n") + "\nOpen it: " + link,
                layout("Approval needed", "<b>" + esc(maker) + "</b> sent <b>" + esc(title) + "</b> from " + esc(team) + " for your approval. You can view it, edit it, and approve it.", note, "Review the design", link));
    }

    public static Mail approved(String to, String name, String editor, String title, String link) {
        return new Mail(to, name, "Approved: " + title, editor + " approved \"" + title + "\". You can publish it now: " + link,
                layout("Your design was approved", "<b>" + esc(editor) + "</b> approved <b>" + esc(title) + "</b>. It is ready to publish.", null, "Open and publish", link));
    }

    public static Mail changesRequested(String to, String name, String editor, String title, String feedback, String link) {
        return new Mail(to, name, "Changes requested: " + title, editor + " asked for changes to \"" + title + "\".\n\n" + feedback + "\n\nOpen it: " + link,
                layout("Changes requested", "<b>" + esc(editor) + "</b> reviewed <b>" + esc(title) + "</b> and asked for changes.", feedback, "Open the design", link));
    }
}
