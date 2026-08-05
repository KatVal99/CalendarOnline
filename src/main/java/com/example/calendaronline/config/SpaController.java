package com.example.calendaronline.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {

    @GetMapping(value = {"/", "/{path:^(?!api|swagger-ui|v3|assets|.*\\..*$).*}"})
    public String forward() {
        return "forward:/index.html";
    }
}
