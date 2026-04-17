# ── Static IP ────────────────────────────────────────────────────────────────

resource "google_compute_global_address" "opencad_ip" {
  name    = "opencad-ip"
  project = var.project
}

# ── Managed SSL certificate ───────────────────────────────────────────────────

resource "google_compute_managed_ssl_certificate" "opencad" {
  name    = "opencad-cert"
  project = var.project

  managed {
    domains = [
      var.domain,
      "www.${var.domain}",
      "app.${var.domain}",
    ]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ── URL map — routes app.opencad.archi → app bucket, everything else → landing ─

resource "google_compute_url_map" "opencad" {
  name            = "opencad-url-map"
  project         = var.project
  default_service = google_compute_backend_bucket.landing.self_link

  host_rule {
    hosts        = ["app.${var.domain}"]
    path_matcher = "app-matcher"
  }

  path_matcher {
    name            = "app-matcher"
    default_service = google_compute_backend_bucket.app.self_link
  }
}

# ── HTTP → HTTPS redirect ─────────────────────────────────────────────────────

resource "google_compute_url_map" "http_redirect" {
  name    = "opencad-http-redirect"
  project = var.project

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "http_redirect" {
  name    = "opencad-http-proxy"
  project = var.project
  url_map = google_compute_url_map.http_redirect.self_link
}

resource "google_compute_global_forwarding_rule" "http" {
  name       = "opencad-http-rule"
  project    = var.project
  target     = google_compute_target_http_proxy.http_redirect.self_link
  ip_address = google_compute_global_address.opencad_ip.address
  port_range = "80"
}

# ── HTTPS proxy + forwarding rule ─────────────────────────────────────────────

resource "google_compute_target_https_proxy" "opencad" {
  name             = "opencad-https-proxy"
  project          = var.project
  url_map          = google_compute_url_map.opencad.self_link
  ssl_certificates = [google_compute_managed_ssl_certificate.opencad.self_link]
}

resource "google_compute_global_forwarding_rule" "https" {
  name       = "opencad-https-rule"
  project    = var.project
  target     = google_compute_target_https_proxy.opencad.self_link
  ip_address = google_compute_global_address.opencad_ip.address
  port_range = "443"
}
