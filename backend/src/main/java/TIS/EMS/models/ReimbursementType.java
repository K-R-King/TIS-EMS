package TIS.EMS.models;

import jakarta.persistence.*;

@Entity
@Table(name = "reimbursement_types")
public class ReimbursementType extends LookupItem {

    public ReimbursementType() {}
    public ReimbursementType(String name) { setName(name); }
}
