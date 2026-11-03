package TIS.EMS.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** API documentation at /swagger-ui.html (raw spec at /v3/api-docs). Use "Authorize" to log in with a username and password. */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI emsOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("TIS Expense Management API")
                        .version("v1")
                        .description("REST API behind the TIS-EMS web app. Every endpoint under /api needs a logged-in "
                                + "session or HTTP Basic credentials; write operations are limited by role "
                                + "(see README: Roles)."))
                .components(new Components().addSecuritySchemes("basic",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("basic")))
                .addSecurityItem(new SecurityRequirement().addList("basic"));
    }
}
