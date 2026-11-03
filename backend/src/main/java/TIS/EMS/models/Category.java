package TIS.EMS.models;

import jakarta.persistence.*;

@Entity
@Table(name = "categories")
public class Category extends LookupItem {

    public Category() {}
    public Category(String name) { setName(name); }
}
