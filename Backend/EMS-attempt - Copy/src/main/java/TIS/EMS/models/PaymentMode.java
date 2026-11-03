package TIS.EMS.models;

import jakarta.persistence.*;

@Entity
@Table(name = "payment_modes")
public class PaymentMode extends LookupItem {

    public PaymentMode() {}
    public PaymentMode(String name) { setName(name); }
}
