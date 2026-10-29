package com.naboo.automotive.sitecontent;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;

import com.naboo.automotive.auth.CurrentUser;
import com.naboo.automotive.auth.Permissions;

@Controller
public class SiteContentController {

    private final SiteContentService service;

    public SiteContentController(SiteContentService service) {
        this.service = service;
    }

    /** Public: the stored JSON site-content document, or null when never saved. */
    @QueryMapping
    public String siteContent() {
        return service.get();
    }

    @MutationMapping
    @PreAuthorize(Permissions.SITE_MANAGE)
    public String updateSiteContent(@Argument String content, @AuthenticationPrincipal Jwt jwt) {
        return service.update(content, CurrentUser.id(jwt));
    }
}
