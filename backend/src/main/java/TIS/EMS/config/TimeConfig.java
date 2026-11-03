package TIS.EMS.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * "Today" and "this month" follow the company's time zone rather than the server's,
 * which is usually UTC in the cloud.
 */
@Configuration
public class TimeConfig {

    @Bean
    public Clock clock(@Value("${ems.time-zone}") String zone) {
        return Clock.system(ZoneId.of(zone));
    }
}
