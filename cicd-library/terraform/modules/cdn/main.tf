resource "aws_cloudfront_distribution" "main" {
  aliases = var.custom_domain_aliases
  
  viewer_certificate {
    acm_certificate_arn            = var.acm_certificate_arn
    cloudfront_default_certificate = var.acm_certificate_arn == null ? true : false
    ssl_support_method             = var.acm_certificate_arn != null ? "sni-only" : null
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  origin {
    domain_name = var.frontend_website_endpoint
    origin_id   = "S3-frontend"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  tags                = var.common_tags

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-frontend"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }
}

# Optional: Route53 records for custom domain
data "aws_route53_zone" "root" {
  count        = var.root_domain != "" ? 1 : 0
  name         = var.root_domain
  private_zone = false
}

resource "aws_route53_record" "alias_root" {
  count   = var.root_domain != "" ? 1 : 0
  zone_id = data.aws_route53_zone.root[0].zone_id
  name    = var.root_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "alias_root_ipv6" {
  count   = var.root_domain != "" ? 1 : 0
  zone_id = data.aws_route53_zone.root[0].zone_id
  name    = var.root_domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "alias_www" {
  count   = var.root_domain != "" ? 1 : 0
  zone_id = data.aws_route53_zone.root[0].zone_id
  name    = "www.${var.root_domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "alias_www_ipv6" {
  count   = var.root_domain != "" ? 1 : 0
  zone_id = data.aws_route53_zone.root[0].zone_id
  name    = "www.${var.root_domain}"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}
