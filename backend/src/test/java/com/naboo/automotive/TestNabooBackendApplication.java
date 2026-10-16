package com.naboo.automotive;

import org.springframework.boot.SpringApplication;

public class TestNabooBackendApplication {

	public static void main(String[] args) {
		SpringApplication.from(NabooBackendApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
