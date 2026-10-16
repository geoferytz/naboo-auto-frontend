package com.naboo.automotive;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class NabooBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(NabooBackendApplication.class, args);
	}

}
