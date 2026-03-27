import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Categories } from '../constants/screening';
import { SCREENING_FORMS } from '../constants/screeningForms';
import SearchContainer from '../components/SearchContainer';
import ScreeningForm from '../components/ScreeningForm';
import { patientService } from '../services/patientServices';
import { hospitalService } from '../services/hospitalServices';

const Screening = () => {
  const { tabId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Navigation Logic
  const handleCategoryClick = (id: string) => {
    setSearchTerm(""); // Clear search when moving into a component
    navigate(`/Screening/${id}`);
  };

  // 2. Filter Logic for the Grid View
  const filteredCategories = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return Categories.filter(cat =>
      cat.title.toLowerCase().includes(term) ||
      cat.description.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  // 3. Helper to find the current category details
  const currentCategory = useMemo(() =>
    Categories.find(c => c.id === tabId),
    [tabId]);

  // 4. Handle form submission
  const handleFormSubmit = async (data: Record<string, any>) => {
    let structuredData: Record<string, any> = {};

    // Structure data based on the form type (tabId)
    switch (tabId) {
      case 'Intake':
        // For patient creation - structure as per API
        structuredData = {
          name: `${data.firstName} ${data.lastName}`,
          firstName: data.firstName,
          lastName: data.lastName,
          dob: data.dob,
          address: data.address,
          email: data.email,
          phone: data.phone,
          emergencyContact: {
            name: data.emergencyContactName,
            phone: data.emergencyContactPhone,
            relationship: data.emergencyContactRelationship
          },
          insurance: data.insurance,
          occupation: data.occupation,
          bloodgroup: data.bloodgroup,
          rh: data.rh,
          race: data.race,
          hospital: data.hospital
        };

        try {
          const response = await patientService.createPatient(structuredData);
          if (response.success) {
            alert('Patient created successfully!');
            navigate('/Patients');
          } else {
            alert('Failed to create patient: ' + (response.message || 'Unknown error'));
          }
        } catch (error: any) {
          console.error('Patient creation error:', error);
          alert('Failed to create patient: ' + (error.message || 'Network error'));
        }
        return; // Don't navigate automatically for patient creation

      case 'Visits':
        structuredData = {
          patientId: data.patientId,
          date: data.date,
          editor: data.editor,
          visitNumber: data.visitNumber,
          gestationWeek: data.gestationWeek,
          visitReason: data.visitReason,
          visitExplanation: data.visitExplanation,
          nextVisit: data.nextVisit
        };

        try {
          const response = await patientService.createRecord('visits', structuredData);
          if (response.success) {
            alert('Visit record created successfully!');
            navigate('/Screening');
          } else {
            alert('Failed to create visit record: ' + (response.message || 'Unknown error'));
          }
        } catch (error: any) {
          console.error('Visit creation error:', error);
          alert('Failed to create visit record: ' + (error.message || 'Network error'));
        }
        return;

      case 'Allergy':
        structuredData = {
          patientId: data.patientId,
          allergyType: data.allergyType,
          allergies: data.allergies,
          editor: data.editor,
          date: data.date
        };

        try {
          const response = await patientService.createRecord('allergies', structuredData);
          if (response.success) {
            alert('Allergy record created successfully!');
            navigate('/Screening');
          } else {
            alert('Failed to create allergy record: ' + (response.message || 'Unknown error'));
          }
        } catch (error: any) {
          console.error('Allergy creation error:', error);
          alert('Failed to create allergy record: ' + (error.message || 'Network error'));
        }
        return;

      case 'Triage':
        structuredData = {
          patientId: data.patientId,
          editor: data.editor,
          date: data.date,
          gestationWeek: data.gestationWeek,
          height: data.height,
          heartRate: data.heartRate,
          diastolic: data.diastolic,
          systolic: data.systolic,
          map: data.map,
          temperature: data.temperature,
          weight: data.weight,
          bmi: data.bmi
        };

        try {
          console.log(structuredData)
          const response = await patientService.createRecord('triage', structuredData);
          if (response.success) {
            alert('Triage record created successfully!');
            navigate('/Screening');
          } else {
            alert('Failed to create triage record: ' + (response.message || 'Unknown error'));
          }
        } catch (error: any) {
          console.error('Triage creation error:', error);
          alert('Failed to create triage record: ' + (error.message || 'Network error'));
        }
        return;

      case 'History':
        structuredData = {
          patientId: data.patientId,
          editor: data.editor,
          date: data.date,
          famHistoryPreeclampsia: data.famHistoryPreeclampsia,
          famHistoryCardiacDisease: data.famHistoryCardiacDisease,
          famHistoryHypertension: data.famHistoryHypertension,
          famHistoryDiabetes: data.famHistoryDiabetes,
          autoimmune: data.autoimmune,
          anemia: data.anemia,
          diabetesMelitus: data.diabetesMelitus,
          chronicHypertension: data.chronicHypertension,
          gravida: data.gravida,
          parity: data.parity,
          miscarriage: data.miscarriage,
          csection: data.csection,
          preeclampsiaHistory: data.preeclampsiaHistory,
          gestationalDiabetesHistory: data.gestationalDiabetesHistory,

          // Missing fields added
          famHistoryGestationalHypertension: data.famHistoryGestationalHypertension,
          famHistoryGestationalDiabetes: data.famHistoryGestationalDiabetes,
          famHistoryAnemia: data.famHistoryAnemia,
          famObeseHistory: data.famObeseHistory,
          famHistoryAutoimmune: data.famHistoryAutoimmune,
          famSickleCell: data.famSickleCell,
          famThalassemia: data.famThalassemia,
          maleAge: data.maleAge,
          malePreeclampsiaPrevHistory: data.malePreeclampsiaPrevHistory,
          liver: data.liver,
          thyroid: data.thyroid,
          cardiacDisease: data.cardiacDisease,
          chronicRenalDisease: data.chronicRenalDisease,
          kidney: data.kidney,
          rheumatoidArthritis: data.rheumatoidArthritis,
          menorrhagia: data.menorrhagia,
          pcos: data.pcos,
          uterineFibroids: data.uterineFibroids,
          hypothyroidism: data.hypothyroidism,
          interval: data.interval,
          lastPeriodDate: data.lastPeriodDate,
          estimatedDueDate: data.estimatedDueDate,
          miscarriageNum: data.miscarriageNum,
          csectionNum: data.csectionNum,
          stillbirth: data.stillbirth,
          stillbirthNum: data.stillbirthNum,
          pph: data.pph,
          infertility: data.infertility,
          ivf: data.ivf,
          eclampsiaHistory: data.eclampsiaHistory,
          gestationalHypertensionHistory: data.gestationalHypertensionHistory,
          firstPreeclampsiaHistory: data.firstPreeclampsiaHistory,
          prevChildWeight: data.prevChildWeight,
          prevGynaSurgery: data.prevGynaSurgery,
          prolongedLabour: data.prolongedLabour,
          prolongedLabourHours: data.prolongedLabourHours,
          contraceptives: data.contraceptives,
          pregnancyHistoryAnemia: data.pregnancyHistoryAnemia
        };

        try {
          const response = await patientService.createRecord('history', structuredData);
          if (response.success) {
            alert('Medical history record created successfully!');
            navigate('/Screening');
          } else {
            alert('Failed to create medical history record: ' + (response.message || 'Unknown error'));
          }
        } catch (error: any) {
          console.error('History creation error:', error);
          alert('Failed to create medical history record: ' + (error.message || 'Network error'));
        }
        return;

      case 'Journey':
        structuredData = {
          patientId: data.patientId,
          editor: data.editor,
          date: data.date,
          gestationweek: data.gestationweek,

          // Pregnancy Complications
          abnormaldoppler: data.abnormaldoppler,
          bleeding: data.bleeding,
          eclampsia: data.eclampsia,
          edema: data.edema,
          malpresentation: data.malpresentation,
          multifetalgestation: data.multifetalgestation,
          pprom: data.pprom,
          prom: data.prom,
          preeclampsia: data.preeclampsia,
          gestationaldiabetes: data.gestationaldiabetes,
          gesthypertension: data.gesthypertension,
          placentaprevia: data.placentaprevia,
          primipaternity: data.primipaternity,

          // Fetal Information
          sexOfFetus: data.sexOfFetus,
          spe: data.spe,

          // Medical Conditions
          anemia: data.anemia,
          malaria: data.malaria,
          hookworm: data.hookworm,
          vitamindDeficiency: data.vitamindDeficiency,
          severAnemia: data.severAnemia,
          highHb: data.highHb
        };

        try {
          const response = await patientService.createRecord('journey', structuredData);
          if (response.success) {
            alert('Pregnancy journey record created successfully!');
            navigate('/Screening');
          } else {
            alert('Failed to create pregnancy journey record: ' + (response.message || 'Unknown error'));
          }
        } catch (error: any) {
          console.error('Journey creation error:', error);
          alert('Failed to create pregnancy journey record: ' + (error.message || 'Network error'));
        }
        return;

      case 'Lab':
        structuredData = {
          patientId: data.patientId,
          editor: data.editor,
          date: data.date,
          gestationweek: data.gestationweek,

          // Blood Chemistry
          alp: data.alp,
          alt: data.alt,
          ast: data.ast,
          albumin: data.albumin,
          bicarbonate: data.bicarbonate,
          bilirubin: data.bilirubin,
          calcium: data.calcium,
          chloride: data.chloride,
          creatinine: data.creatinine,
          glutamyl: data.glutamyl,
          potassium: data.potassium,
          sodium: data.sodium,
          uricAcid: data.uricAcid,
          bun: data.bun,

          // Blood Sugar Tests
          fbs: data.fbs,
          fbs1: data.fbs1,
          fbs2: data.fbs2,
          hba1c: data.hba1c,
          hba1cValue: data.hba1cValue,
          randombloodsugar: data.randombloodsugar,

          // Hematology
          ht: data.ht,
          leukocyte: data.leukocyte,
          haemoglobin: data.haemoglobin,
          mch: data.mch,
          mchc: data.mchc,
          mcv: data.mcv,
          platelets: data.platelets,
          rbc: data.rbc,
          wbc: data.wbc,

          // Thyroid Function
          t3: data.t3,
          t4: data.t4,
          tsh: data.tsh,

          // Urine Analysis
          ketones: data.ketones,
          clarity: data.clarity,
          sg: data.sg,
          ph: data.ph,
          urineColor: data.urineColor,
          urineGlucose: data.urineGlucose,
          urineNitrite: data.urineNitrite,
          urineOdor: data.urineOdor,
          urineProtein: data.urineProtein,

          // Diagnosis
          diagnosis: data.diagnosis,
          diagnosisId: data.diagnosisId
        };

        try {
          const response = await patientService.createRecord('labwork', structuredData);
          if (response.success) {
            alert('Laboratory record created successfully!');
            navigate('/Screening');
          } else {
            alert('Failed to create laboratory record: ' + (response.message || 'Unknown error'));
          }
        } catch (error: any) {
          console.error('Lab creation error:', error);
          alert('Failed to create laboratory record: ' + (error.message || 'Network error'));
        }
        return;

      case 'Infection':
        structuredData = {
          patientId: data.patientId, // This will be the actual patient ID
          editor: data.editor,
          date: data.date,
          hiv: data.hiv,
          syphilis: data.syphilis,
          hepB: data.hepB,
          rubella: data.rubella,
          hepC: data.hepC
        };

        try {
          const response = await patientService.createRecord('infections', structuredData);
          if (response.success) {
            alert('Infection screening record created successfully!');
            navigate('/Screening');
          } else {
            alert('Failed to create infection screening record: ' + (response.message || 'Unknown error'));
          }
        } catch (error: any) {
          console.error('Infection creation error:', error);
          alert('Failed to create infection screening record: ' + (error.message || 'Network error'));
        }
        return;

      case 'Lifestyle':
        structuredData = {
          patientId: data.patientId, // This will be the actual patient ID
          editor: data.editor,
          date: data.date,
          smoking: data.smoking,
          diet: data.diet,
          exercise: data.exercise,
          alcoholConsumption: data.alcoholConsumption,
          caffeine: data.caffeine,
          caffeineQuantity: data.caffeineQuantity,
          sugarDrink: data.sugarDrink
        };

        try {
          const response = await patientService.createRecord('patientLifestyle', structuredData);
          if (response.success) {
            alert('Lifestyle assessment record created successfully!');
            navigate('/Screening');
          } else {
            alert('Failed to create lifestyle assessment record: ' + (response.message || 'Unknown error'));
          }
        } catch (error: any) {
          console.error('Lifestyle creation error:', error);
          alert('Failed to create lifestyle assessment record: ' + (error.message || 'Network error'));
        }
        return;

      case 'Fetal':
        structuredData = {
          patientId: data.patientId, // This will be the actual patient ID
          editor: data.editor,
          date: data.date,
          gestationWeek: data.gestationWeek,
          fhr: data.fhr,
          femurHeight: data.femurHeight,
          headCircumference: data.headCircumference
        };

        try {
          const response = await patientService.createRecord('fetalInfo', structuredData);
          if (response.success) {
            alert('Fetal development record created successfully!');
            navigate('/Screening');
          } else {
            alert('Failed to create fetal development record: ' + (response.message || 'Unknown error'));
          }
        } catch (error: any) {
          console.error('Fetal creation error:', error);
          alert('Failed to create fetal development record: ' + (error.message || 'Network error'));
        }
        return;

      case 'Ultrasound':
        structuredData = {
          patientId: data.patientId, // This will be the actual patient ID
          editor: data.editor,
          date: data.date,
          gestationWeek: data.gestationWeek,
          amniotic: data.amniotic,
          imageUrl: data.imageUrl
        };

        try {
          const response = await patientService.createRecord('ultrasounds', structuredData);
          if (response.success) {
            alert('Ultrasound record created successfully!');
            navigate('/Screening');
          } else {
            alert('Failed to create ultrasound record: ' + (response.message || 'Unknown error'));
          }
        } catch (error: any) {
          console.error('Ultrasound creation error:', error);
          alert('Failed to create ultrasound record: ' + (error.message || 'Network error'));
        }
        return;

      case 'Prescription':
        structuredData = {
          patientId: data.patientId, // This will be the actual patient ID
          editor: data.editor,
          date: data.date,
          gestationWeek: data.gestationWeek,
          trimester: data.trimester,
          medicine: data.medicine,
          prescription: data.prescription,
          dosage: data.dosage,
          startDate: data.startDate,
          stopDate: data.stopDate,
          medicationPurpose: data.medicationPurpose
        };

        try {
          const response = await patientService.createRecord('medications', structuredData);
          if (response.success) {
            alert('Prescription record created successfully!');
            navigate('/Screening');
          } else {
            alert('Failed to create prescription record: ' + (response.message || 'Unknown error'));
          }
        } catch (error: any) {
          console.error('Prescription creation error:', error);
          alert('Failed to create prescription record: ' + (error.message || 'Network error'));
        }
        return;

      default:
        console.log('Unknown form type:', tabId);
        alert('Form type not supported yet');
        return;
    }
  };

  return (
    <div className="pb-10 w-full flex flex-col bg-white">
      {/* HEADER SECTION */}
      <div className="sticky top-0 z-20 bg-white pt-6 pb-4 w-full flex justify-between items-center">
        <div className="text-[1.3em] font-medium flex items-center gap-3">
          {tabId ? (
            <div className='pt-2'>
              <span
                className="cursor-pointer hover:text-[#008540]"
                onClick={() => navigate('/Screening')}
              >
                Screening
              </span>
              <span className="text-lg"> / </span>
              <span className="text-[#008540]">{currentCategory?.title}</span>
            </div>
          ) : (
            "Screening"
          )}
        </div>

        {/* Search Bar: Only visible on the main Grid View */}
        {!tabId && (
          <SearchContainer
            placeholder="Search modules..."
            onSearch={setSearchTerm}
            showAdd={false}
            showRefresh={false}
            searchValue={searchTerm}
          />
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      {!tabId ? (
        // --- GRID VIEW ---
        <div className="w-full">
          {filteredCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCategories.map((test) => (
                <div
                  key={test.id}
                  onClick={() => handleCategoryClick(test.id)}
                  className="group relative bg-[#008540] p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl overflow-hidden min-h-[180px] flex flex-col justify-end"
                >
                  {/* Decorative background circle */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />

                  <div className="relative z-10">
                    <h2 className="text-2xl text-white mb-2 leading-tight">
                      {test.title}
                    </h2>
                    <p className="text-white/80 text-sm leading-relaxed line-clamp-2">
                      {test.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <p className="text-gray-500 font-medium">No screening modules match "{searchTerm}"</p>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-2 text-[#008540] underline"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      ) : (
        // --- FORM VIEW ---
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white min-h-[60vh] overflow-hidden">
            {/* Dynamic Form Injection */}
            <div className="p-8">
              {tabId && SCREENING_FORMS[tabId] ? (
                <ScreeningForm
                  title={SCREENING_FORMS[tabId].title}
                  fields={SCREENING_FORMS[tabId].fields}
                  onSubmit={handleFormSubmit}
                  isLastStep={true}
                />
              ) : (
                <div className="text-center py-20">
                  <p className="text-gray-500 text-lg">Form not available for this module</p>
                  <button
                    onClick={() => navigate('/Screening')}
                    className="mt-4 px-6 py-2 bg-[#008540] text-white rounded-lg hover:bg-[#007235] transition-colors"
                  >
                    Back to Screening
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Screening;